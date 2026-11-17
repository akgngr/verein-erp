# UI kit (W3–W5)

`@/shared/components/kit` modüllerin framework destekli temel bileşenlere eriştiği **tek** giriştir. `@heroui/react` yalnız `src/shared` içinde kalır.

| Aile | Kit bileşeni | Not |
|---|---|---|
| Form (W3) | `TextField`, `Input`, `TextArea`, `Label`, `Description`, `FieldError`, `InputGroup(.Prefix/.Suffix/.Input)` | Bileşim aynı: `<TextField><Label/><Input/></TextField>` |
| | `Select` + `Select.Item` | Trigger, popover ve listbox kit içinde; `size="sm"` sıkı yükseklik |
| | `ComboBox` + `.InputGroup/.Trigger/.Popover/.List/.Item` | |
| | `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup`, `Radio`, `Slider` | Control, indicator ve thumb kit içinde; çocuklar yalnız etiket içeriği |
| | `DateInput` | ISO tarih metni (`"YYYY-MM-DD"`, boş = `""`); `minValue`/`maxValue` da metin |
| Katman (W4) | `Dialog` (+ `.Header/.Heading/.Body/.Footer`) | `size`, `scroll`, `isDismissable`, `className`, `aria-label` kökte; çocuk `({ close }) => …` olabilir |
| | `Sheet` (+ aynı parçalar) | `placement` |
| | `Tooltip` + `Tooltip.Content`, `Dropdown` + `.Popover/.Menu/.Item/.Section/.SectionHeader` | `Dropdown.Item tone="danger"` |
| Görüntüleme (W5) | `Spinner` (`tone="current" \| "accent"`), `StatusChip` (`tone`), `Badge` (`content`, `tone`), `Card`, `Tabs` (+ `.List/.Tab/.Panel`, `emphasis`), `Separator`, `ProgressBar` (`tone`), `Table` | Tab göstergesi, liste kabı, progress track kit içinde |

Kurallar:
- Kit API'sinde `variant`, `color`, `classNames`, `data-slot` yoktur. Ton `tone`, vurgu `emphasis` ile verilir.
- `className` yalnız yerleşim içindir.
- Daha yüksek seviyeli hazır alanlar için `@/shared/components/fields` (`TextInputField`, `CheckboxField` …) ve react-hook-form için `@/shared/components/forms/*` kullanılır.
- Framework değişirse yalnız `src/shared/components/kit` (ve `fields`, `forms`, `ui`) yeniden yazılır.
