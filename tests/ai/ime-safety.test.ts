import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  isImeCompositionActive,
  shouldSubmitOnEnter,
} from "@/modules/ai/lib/ime";

describe("AI Chat IME / Klavye Güvenliği (Issue #327)", () => {
  describe("isImeCompositionActive", () => {
    test("nativeEvent.isComposing true olduğunda aktif kompozisyonu algılar", () => {
      const syntheticEvent = {
        key: "Enter",
        keyCode: 13,
        nativeEvent: { isComposing: true },
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      assert.equal(isImeCompositionActive(syntheticEvent), true);
    });

    test("event.isComposing true olduğunda aktif kompozisyonu algılar", () => {
      const syntheticEvent = {
        key: "Enter",
        keyCode: 13,
        isComposing: true,
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      assert.equal(isImeCompositionActive(syntheticEvent), true);
    });

    test("Safari WebKit 165004 uyumluluğu: keyCode === 229 (VK_PROCESSKEY) durumunda aktif kompozisyonu algılar", () => {
      const syntheticEvent = {
        key: "Enter",
        keyCode: 229,
        nativeEvent: { isComposing: false },
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      assert.equal(isImeCompositionActive(syntheticEvent), true);
    });

    test("Standart Enter (Latin/doğrudan giriş) durumunda kompozisyon olmadığını doğrular", () => {
      const syntheticEvent = {
        key: "Enter",
        keyCode: 13,
        nativeEvent: { isComposing: false },
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      assert.equal(isImeCompositionActive(syntheticEvent), false);
    });

    test("Doğrudan KeyboardEvent (DOM Event) nesneleriyle de doğru çalışır", () => {
      const domImeEvent = {
        key: "Enter",
        keyCode: 229,
        isComposing: true,
      } as KeyboardEvent;

      assert.equal(isImeCompositionActive(domImeEvent), true);

      const domNormalEvent = {
        key: "Enter",
        keyCode: 13,
        isComposing: false,
      } as KeyboardEvent;

      assert.equal(isImeCompositionActive(domNormalEvent), false);
    });
  });

  describe("shouldSubmitOnEnter", () => {
    test("Normal Enter durumunda true döner", () => {
      assert.equal(
        shouldSubmitOnEnter({
          key: "Enter",
          shiftKey: false,
          keyCode: 13,
          nativeEvent: { isComposing: false },
        }),
        true,
      );
    });

    test("Shift + Enter durumunda satır atlamaya izin vermek için false döner", () => {
      assert.equal(
        shouldSubmitOnEnter({
          key: "Enter",
          shiftKey: true,
          keyCode: 13,
          nativeEvent: { isComposing: false },
        }),
        false,
      );
    });

    test("IME aktifken (isComposing: true) Enter basıldığında false döner", () => {
      assert.equal(
        shouldSubmitOnEnter({
          key: "Enter",
          shiftKey: false,
          keyCode: 13,
          nativeEvent: { isComposing: true },
        }),
        false,
      );
    });

    test("Safari IME durumunda (keyCode: 229) Enter basıldığında false döner", () => {
      assert.equal(
        shouldSubmitOnEnter({
          key: "Enter",
          shiftKey: false,
          keyCode: 229,
          nativeEvent: { isComposing: false },
        }),
        false,
      );
    });

    test("Enter dışındaki tuşlarda false döner", () => {
      assert.equal(shouldSubmitOnEnter({ key: "a", shiftKey: false, keyCode: 65 }), false);
      assert.equal(shouldSubmitOnEnter({ key: "Escape", shiftKey: false, keyCode: 27 }), false);
    });
  });

  describe("onKeyDown akış senaryoları", () => {
    function simulateKeydown(
      eventOptions: {
        key: string;
        shiftKey?: boolean;
        keyCode?: number;
        isComposing?: boolean;
      },
      onSend: () => void,
    ) {
      let defaultPrevented = false;
      const event = {
        key: eventOptions.key,
        shiftKey: Boolean(eventOptions.shiftKey),
        keyCode: eventOptions.keyCode ?? (eventOptions.key === "Enter" ? 13 : 65),
        nativeEvent: {
          isComposing: Boolean(eventOptions.isComposing),
        },
        preventDefault: () => {
          defaultPrevented = true;
        },
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      // ai-chat-panel.tsx içindeki onKeyDown mantığı
      if (event.key === "Enter" && !event.shiftKey) {
        if (isImeCompositionActive(event)) {
          return { defaultPrevented, sent: false };
        }
        event.preventDefault();
        onSend();
        return { defaultPrevented, sent: true };
      }

      return { defaultPrevented, sent: false };
    }

    test("Normal Enter: preventDefault çağrılır ve send() tetiklenir", () => {
      let sentCount = 0;
      const result = simulateKeydown(
        { key: "Enter", shiftKey: false, isComposing: false, keyCode: 13 },
        () => {
          sentCount++;
        },
      );

      assert.equal(result.sent, true);
      assert.equal(result.defaultPrevented, true);
      assert.equal(sentCount, 1);
    });

    test("Shift + Enter: satır atlamaya izin verilir (send tetiklenmez, preventDefault çağrılmaz)", () => {
      let sentCount = 0;
      const result = simulateKeydown(
        { key: "Enter", shiftKey: true, isComposing: false, keyCode: 13 },
        () => {
          sentCount++;
        },
      );

      assert.equal(result.sent, false);
      assert.equal(result.defaultPrevented, false);
      assert.equal(sentCount, 0);
    });

    test("IME Enter (isComposing: true): karakter onayına izin verilir, mesaj gönderilmez", () => {
      let sentCount = 0;
      const result = simulateKeydown(
        { key: "Enter", shiftKey: false, isComposing: true, keyCode: 13 },
        () => {
          sentCount++;
        },
      );

      assert.equal(result.sent, false);
      assert.equal(result.defaultPrevented, false);
      assert.equal(sentCount, 0);
    });

    test("Safari IME Enter (keyCode: 229): karakter onayına izin verilir, mesaj gönderilmez", () => {
      let sentCount = 0;
      const result = simulateKeydown(
        { key: "Enter", shiftKey: false, isComposing: false, keyCode: 229 },
        () => {
          sentCount++;
        },
      );

      assert.equal(result.sent, false);
      assert.equal(result.defaultPrevented, false);
      assert.equal(sentCount, 0);
    });

    test("Diğer tuşlar (örn. normal harfler): işlem yapılmaz", () => {
      let sentCount = 0;
      const result = simulateKeydown(
        { key: "a", shiftKey: false, isComposing: false, keyCode: 65 },
        () => {
          sentCount++;
        },
      );

      assert.equal(result.sent, false);
      assert.equal(result.defaultPrevented, false);
      assert.equal(sentCount, 0);
    });
  });
});
