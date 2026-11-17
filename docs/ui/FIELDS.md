# Form alanları (UI Platform W3)

**Durum:** Ortak bileşenler hazır; modül geçişi W2 merge edildikten sonra W3 dalgasında yapılacak (`docs/ui/WORK_SPLIT.md`).

Modüller form alanlarını yalnız `@/shared/components/fields` üzerinden kullanır. HeroUI'nin bileşen parçaları (`TextField`, `Input`, `Label`, `Description`, `FieldError`, `InputGroup`, `Checkbox.*`, `Switch.*`, `Radio.*`) modüllerde import edilmez.

| Eski kullanım (modülde) | Ortak bileşen |
|---|---|
| `TextField` + `Label` + `Input` (+ `Description`/`FieldError`) | `TextInputField` |
| `TextField` + `InputGroup.Prefix/Suffix` | `TextInputField` (`prefix`, `suffix`) |
| `TextField` + `TextArea` | `TextAreaField` |
| `Checkbox` + `Checkbox.Content/Control/Indicator` + `Label` | `CheckboxField` |
| `Switch` + `Switch.Content/Control/Thumb` + `Label` | `SwitchField` |
| `RadioGroup` + `Radio.*` | `RadioGroupField` |
| `Select` + `ListBox` | `SelectField` |
| react-hook-form | Mevcut `@/shared/components/forms/*` (`FormInput`, `FormTextarea`, `FormSwitch`, `FormSelect`, `FormDatePicker` …) |

## Ortak sözleşme (`FieldBaseProps`)

- `label`: görünür etiket. Yoksa `ariaLabel` zorunludur.
- `description`: yardım metni.
- `error`: hata metni. Doluysa alan geçersiz (`aria-invalid`) olur.
- `isRequired`, `isDisabled`, `isReadOnly`.
- `id`, `name`.
- `className`: yalnız yerleşim (genişlik, grid, boşluk).
- `size: "sm" | "md"`: metin alanlarında yükseklik.

Stil slotları (`classNames`), `variant`, `color` ve `data-slot` seçicileri API'de yoktur. `tests/shared/fields.test.ts` bunu ve erişilebilirlik semantiğini (etiket bağlantısı, `aria-invalid`, `role="switch"`, `role="radiogroup"`) denetler.

## Sonraki adımlar (W3)

- ComboBox, DatePicker/DateField, CheckboxGroup ve Slider için ortak bileşenler.
- Modül geçişi: bileşen ailesi bazında codemod ve elle gözden geçirme. Etkilenen modüllerin sürüm artışları tek sahiplikle yapılır.
