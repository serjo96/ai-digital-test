# Разметка для человеческой проверки — этап 1

Все 20 случаев — AI-assisted provisional, не hand-labelled ground truth. 14 development / 6 holdout. Группы — явные черновые решения после просмотра заголовков и specs; это не экспорт предсказаний pipeline.

Предпочтительный порядок проверки: подготовить UI из актуального full-input/holdout replay (`npm run web:prepare -- --run-dir reports/B3-openai-full-input-atomic-v2-holdout-replay`), открыть вкладку **Check product matching**, сверить каждую строку и полноту семейства и подтвердить все 20 случаев. Экспорт станет доступен только после заполнения reviewer. Если решение неверно, не подтверждать его: записать case ID и исправить expectedGroups/nonProductRowIds/unknownPairs в новой версии labels. Разные группы и разные случаи означают известное различие, кроме явно указанных unknownPairs; при неизвестной связи не ставить отрицательную метку.

Первый holdout replay уже выполнен 2026-09-12 и тем самым раскрыт. Не использовать его для настройки правил или prompts; если человеческая проверка выявит ошибку в labels, исправление и повторный результат явно считать post-holdout development. После правки меток создать новую версию и новые отчёты; B0 не перезаписывать.

## nimbus — development / provisional

Nimbus 2 и Nimbus 2 Pro различны. Две строки базовой модели предварительно относятся к одному товару; 1.2kg/42oz не решаем на этапе 1.

Ожидаемые группы: [["row_c2467f5304", "row_f3873a8816"], ["row_cdf75e46ea"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_c2467f5304",
  "supplier": "Direct2Retail",
  "supplier_sku": "D2R-NIM2",
  "raw_title": "NIMBUS 2 speaker - waterproof",
  "raw_specs": "12 W, 14 hour battery, IP67 rated, 42 oz",
  "price": "$89.99",
  "stock": 127
}
```

```json
{
  "row_id": "row_cdf75e46ea",
  "supplier": "NordicDist",
  "supplier_sku": "ND-2202",
  "raw_title": "Nimbus 2 Pro Portable Bluetooth Speaker",
  "raw_specs": "24W output; 18h battery; IP67; weight 1.6kg; stereo pairing",
  "price": "£119.00",
  "stock": 126
}
```

```json
{
  "row_id": "row_f3873a8816",
  "supplier": "NordicDist",
  "supplier_sku": "ND-2201",
  "raw_title": "Nimbus 2 Portable Bluetooth Speaker",
  "raw_specs": "12W output; 14h battery; IP67; weight 1.2kg",
  "price": "£79.00",
  "stock": 257
}
```

## aerobuds — development / provisional

Два явно чёрных AeroBuds Pro предварительно совпадают; ear tips — самостоятельный аксессуар. У немецкой строки цвет отсутствует: отношения с обеими чёрными строками unknown. 18h и 20h with case требуют отдельного согласования позже.

Ожидаемые группы: [["row_11bb99b2fa", "row_bdbc045131"], ["row_e0afb74574"], ["row_fe3ff4b356"]]

Не-товары: []

Неизвестные пары: [["row_11bb99b2fa", "row_e0afb74574"], ["row_bdbc045131", "row_e0afb74574"]]

```json
{
  "row_id": "row_11bb99b2fa",
  "supplier": "PacRim Trading",
  "supplier_sku": "PR-AB-PRO-BK",
  "raw_title": "Aerobuds PRO earbud, black, ANC",
  "raw_specs": "Active noise cancelling, BT 5.3, 20 hours playback (incl. charging case), water resistant IPX4",
  "price": "USD 149",
  "stock": 101
}
```

```json
{
  "row_id": "row_bdbc045131",
  "supplier": "NordicDist",
  "supplier_sku": "ND-4417",
  "raw_title": "AeroBuds Pro True Wireless Earbuds - Black",
  "raw_specs": "ANC; Bluetooth 5.3; 20h total playback with case; IPX4; USB-C",
  "price": "£129.99",
  "stock": 61
}
```

```json
{
  "row_id": "row_e0afb74574",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "ES-99120",
  "raw_title": "AEROBUDS PRO / schwarz / ANC",
  "raw_specs": "Bluetooth 5.3, Akku 18h, IPX4, USB-C Ladecase",
  "price": "139,00 EUR",
  "stock": 203
}
```

```json
{
  "row_id": "row_fe3ff4b356",
  "supplier": "NordicDist",
  "supplier_sku": "ND-4418",
  "raw_title": "AeroBuds Pro replacement ear tips (S/M/L)",
  "raw_specs": "Silicone, 3 sizes, compatible with AeroBuds Pro",
  "price": "£8.99",
  "stock": 143
}
```

## sony — development / provisional

WH-880N/WH880N предварительно одна модель, включая OPEN BOX. Состояние относится к предложению; рекламные превосходные степени не характеристики.

Ожидаемые группы: [["row_05e5d126cb", "row_1e60b0a9dc", "row_7f3f1b14c3"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_05e5d126cb",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-8812",
  "raw_title": "sony wh880n headphones OPEN BOX",
  "raw_specs": "AMAZING SOUND!!! BEST HEADPHONES 2026!!! GRAB IT FAST!!!",
  "price": "$179",
  "stock": 67
}
```

```json
{
  "row_id": "row_1e60b0a9dc",
  "supplier": "PacRim Trading",
  "supplier_sku": "PR-SNY-880",
  "raw_title": "SONY WH-880N Wireless Over-Ear",
  "raw_specs": "ANC, 30h battery, multipoint, foldable",
  "price": "USD 249",
  "stock": 399
}
```

```json
{
  "row_id": "row_7f3f1b14c3",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "ES-77310",
  "raw_title": "Sony Corp. WH880N Kopfhoerer",
  "raw_specs": "Noise Cancelling, 30 Stunden, Multipoint, faltbar",
  "price": "229,00 EUR",
  "stock": 250
}
```

## slate — development / provisional

Один товар с пустыми specs; неполнота не означает не-товар.

Ожидаемые группы: [["row_76b28cdc31"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_76b28cdc31",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-9001",
  "raw_title": "Slate 11 tablet",
  "raw_specs": "",
  "price": "$189",
  "stock": 114
}
```

## volt — development / provisional

65W, GaN и 3-port указаны в названии. New in box — состояние предложения, не техническая характеристика.

Ожидаемые группы: [["row_1134eb89e7"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_1134eb89e7",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-9002",
  "raw_title": "Volt 65W GaN charger 3-port",
  "raw_specs": "new in box",
  "price": "$34",
  "stock": 272
}
```

## quill — development / provisional

Включены все Quill: lamp и lamp 3 различны; lamp, hub, camera и case различны. Две Quill 3 desk lamp предварительно совпадают даже при пустых specs у обеих.

Ожидаемые группы: [["row_06dc75e525", "row_3f77cefacd"], ["row_11462769c5"], ["row_4d609c9ff9", "row_6668f30f9e"], ["row_641c690d68", "row_73d3ec91bb"], ["row_a60219abb1", "row_bddc33a831"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_06dc75e525",
  "supplier": "NordicDist",
  "supplier_sku": "NO-9311",
  "raw_title": "Quill 2 action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "£432.99",
  "stock": 182
}
```

```json
{
  "row_id": "row_11462769c5",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-8274",
  "raw_title": "Quill desk lamp",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "$223.99",
  "stock": 409
}
```

```json
{
  "row_id": "row_3f77cefacd",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-4399",
  "raw_title": "Quill 2 action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "23,99 EUR",
  "stock": 348
}
```

```json
{
  "row_id": "row_4d609c9ff9",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-4888",
  "raw_title": "Quill 3 desk lamp",
  "raw_specs": "",
  "price": "668,99 EUR",
  "stock": 81
}
```

```json
{
  "row_id": "row_641c690d68",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-2784",
  "raw_title": "Quill 3 USB-C hub",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "USD 727",
  "stock": 80
}
```

```json
{
  "row_id": "row_6668f30f9e",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-4595",
  "raw_title": "QUILL 3 DESK LAMP",
  "raw_specs": "",
  "price": "$658.99",
  "stock": 134
}
```

```json
{
  "row_id": "row_73d3ec91bb",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-8902",
  "raw_title": "Quill 3 USB-C hub",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "$473.99",
  "stock": 214
}
```

```json
{
  "row_id": "row_a60219abb1",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-7608",
  "raw_title": "QUILL PLUS TABLET CASE",
  "raw_specs": "folio; auto sleep/wake",
  "price": "80,99 EUR",
  "stock": 279
}
```

```json
{
  "row_id": "row_bddc33a831",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-2644",
  "raw_title": "QUILL PLUS TABLET CASE",
  "raw_specs": "folio; auto sleep/wake",
  "price": "USD 847",
  "stock": 234
}
```

## ledgerlite — development / provisional

Book 14 Laptop/Notebook предварительно одна модель. 16GB/512GB совпадают; округление веса отложено этапу 2.

Ожидаемые группы: [["row_87ace126d4", "row_92da044aa3"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_87ace126d4",
  "supplier": "Direct2Retail",
  "supplier_sku": "D2R-LLB14",
  "raw_title": "LedgerLite Book 14 Laptop",
  "raw_specs": "14\" display, 16 GB memory, 512 GB storage, 2.9 lbs",
  "price": "$949.00",
  "stock": 29
}
```

```json
{
  "row_id": "row_92da044aa3",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "ES-11450",
  "raw_title": "LedgerLite Book 14 Notebook",
  "raw_specs": "14 Zoll, 16GB RAM, 512GB SSD, 1.3 kg",
  "price": "899,00 EUR",
  "stock": 140
}
```

## vault — development / provisional

Две формулировки Vault 2TB portable SSD предварительно один товар; гарантия одного поставщика не переносится на все предложения.

Ожидаемые группы: [["row_22e59912ad", "row_fbe753d7cc"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_22e59912ad",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-5540B",
  "raw_title": "VAULT 2TB SSD portable drive",
  "raw_specs": "2 terabyte, USB-C, fast",
  "price": "$129",
  "stock": 136
}
```

```json
{
  "row_id": "row_fbe753d7cc",
  "supplier": "NordicDist",
  "supplier_sku": "ND-5540",
  "raw_title": "Vault Portable SSD 2TB",
  "raw_specs": "USB 3.2 Gen2; up to 1050MB/s read; USB-C; 3yr warranty",
  "price": "£139.00",
  "stock": 264
}
```

## taskflow — development / provisional

K2 brown TKL/mech и mechanical keyboard brown switch предварительно одна модель; brown не удаляется из идентичности.

Ожидаемые группы: [["row_64543589fc", "row_a386736693"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_64543589fc",
  "supplier": "NordicDist",
  "supplier_sku": "ND-7701",
  "raw_title": "TaskFlow K2 Mechanical Keyboard (brown switch)",
  "raw_specs": "TKL; hot-swap; USB-C; RGB; brown tactile switches",
  "price": "£89.00",
  "stock": 380
}
```

```json
{
  "row_id": "row_a386736693",
  "supplier": "PacRim Trading",
  "supplier_sku": "PR-TF-K2-BR",
  "raw_title": "Taskflow K2 mech keyboard tenkeyless brown",
  "raw_specs": "Hot swappable, tenkeyless, RGB backlight, USB C, tactile brown",
  "price": "USD 99",
  "stock": 243
}
```

## pulsefit — development / provisional

Band 3 activity/fitness tracker предварительно одна модель. HR/SpO2 не дополняем внешними знаниями.

Ожидаемые группы: [["row_3e2dd6416e", "row_94d9860adf"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_3e2dd6416e",
  "supplier": "PacRim Trading",
  "supplier_sku": "PR-PF-B3",
  "raw_title": "Pulsefit band 3 activity tracker",
  "raw_specs": "Heart rate, blood oxygen, 10-day battery, 5 ATM water rating, 1.1 inch display",
  "price": "USD 69",
  "stock": 394
}
```

```json
{
  "row_id": "row_94d9860adf",
  "supplier": "NordicDist",
  "supplier_sku": "ND-6650",
  "raw_title": "PulseFit Band 3 Fitness Tracker",
  "raw_specs": "HR + SpO2; 10 day battery; 5ATM; 1.1in AMOLED",
  "price": "£59.99",
  "stock": 4
}
```

## lumen — development / provisional

X20 Compact Digital Camera/Kompaktkamera предварительно одна модель: поддерживается моделью и совместимыми specs.

Ожидаемые группы: [["row_1d1bdffe92", "row_83da10f114"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_1d1bdffe92",
  "supplier": "Direct2Retail",
  "supplier_sku": "D2R-LX20",
  "raw_title": "Lumen X20 Compact Digital Camera",
  "raw_specs": "20MP sensor, 5x optical zoom, 4K video at 30fps",
  "price": "$429.00",
  "stock": 345
}
```

```json
{
  "row_id": "row_83da10f114",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "ES-31002",
  "raw_title": "Lumen X20 Kompaktkamera",
  "raw_specs": "20 MP, 5x optischer Zoom, 4K/30, SD-Karte",
  "price": "399,00 EUR",
  "stock": 138
}
```

## cobalt — development / provisional

Все Cobalt включены вместе: Pro/X/Lite/2/3 и разные типы — разные товары даже при шаблонных specs. Два Pro USB-C hub предварительно совпадают; $23.99/$867.99 не исправляем.

Ожидаемые группы: [["row_3fdcec64b2"], ["row_68d860d397", "row_78b4c42770"], ["row_6eddbd5517", "row_f0ad473862"], ["row_71847a9c05"], ["row_833c7feebb"], ["row_a8a875a60c"], ["row_b2475a3df6"], ["row_b40060c12f"], ["row_b82f7fcc2a"], ["row_bb41623d6c"], ["row_bb6d2613d4"], ["row_e67082ee31"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_3fdcec64b2",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-5533",
  "raw_title": "Cobalt Lite USB-C hub",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "$484.99",
  "stock": 183
}
```

```json
{
  "row_id": "row_68d860d397",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-9105",
  "raw_title": "Cobalt smart scale",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "USD 472",
  "stock": 442
}
```

```json
{
  "row_id": "row_6eddbd5517",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-5116",
  "raw_title": "Cobalt Pro USB-C hub",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "$23.99",
  "stock": 93
}
```

```json
{
  "row_id": "row_71847a9c05",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-5063",
  "raw_title": "COBALT 3 SMART SCALE",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "$836.99",
  "stock": 435
}
```

```json
{
  "row_id": "row_78b4c42770",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-8217",
  "raw_title": "Cobalt smart scale",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "103,99 EUR",
  "stock": 152
}
```

```json
{
  "row_id": "row_833c7feebb",
  "supplier": "NordicDist",
  "supplier_sku": "NO-1586",
  "raw_title": "COBALT PRO WIRED EARBUDS",
  "raw_specs": "",
  "price": "£386.99",
  "stock": 58
}
```

```json
{
  "row_id": "row_a8a875a60c",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-2718",
  "raw_title": "Cobalt X wired earbuds",
  "raw_specs": "3.5mm; in-line mic",
  "price": "435,99 EUR",
  "stock": 18
}
```

```json
{
  "row_id": "row_b2475a3df6",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-4701",
  "raw_title": "Cobalt X action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "$238.99",
  "stock": 352
}
```

```json
{
  "row_id": "row_b40060c12f",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-6670",
  "raw_title": "Cobalt Pro action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "$114.99",
  "stock": 456
}
```

```json
{
  "row_id": "row_b82f7fcc2a",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-3452",
  "raw_title": "Cobalt X desk lamp",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "$29.99",
  "stock": 130
}
```

```json
{
  "row_id": "row_bb41623d6c",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-5988",
  "raw_title": "Cobalt Pro bookshelf speaker pair",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "$180.99",
  "stock": 220
}
```

```json
{
  "row_id": "row_bb6d2613d4",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-5258",
  "raw_title": "Cobalt X wireless mouse",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "$615.99",
  "stock": 62
}
```

```json
{
  "row_id": "row_e67082ee31",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-9327",
  "raw_title": "Cobalt 2 smart scale",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "$862.99",
  "stock": 4
}
```

```json
{
  "row_id": "row_f0ad473862",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-4597",
  "raw_title": "Cobalt Pro USB-C hub",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "$867.99",
  "stock": 317
}
```

## onyx — development / provisional

Все Onyx включены вместе. Lite и 2 action camera различны несмотря на одинаковые 4K60/10m; типы и варианты сохраняются.

Ожидаемые группы: [["row_17f5e3070f"], ["row_4730fd8686"], ["row_55a8c9b86d", "row_74b8f7797a"], ["row_56f937bd9e"], ["row_5824054a52"], ["row_654f1fb60f"], ["row_6f66c4cb9e"], ["row_a1bb1ad2e9"], ["row_e571323780"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_17f5e3070f",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-3301",
  "raw_title": "Onyx 2 bookshelf speaker pair",
  "raw_specs": "",
  "price": "$674.99",
  "stock": 405
}
```

```json
{
  "row_id": "row_4730fd8686",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-6016",
  "raw_title": "Onyx Lite microSD card 256GB",
  "raw_specs": "UHS-I; A2; up to 170MB/s",
  "price": "$587.99",
  "stock": 113
}
```

```json
{
  "row_id": "row_55a8c9b86d",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-9845",
  "raw_title": "Onyx Lite wireless mouse",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "$397.99",
  "stock": 45
}
```

```json
{
  "row_id": "row_56f937bd9e",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-2036",
  "raw_title": "ONYX PRO TABLET CASE",
  "raw_specs": "folio; auto sleep/wake",
  "price": "USD 15",
  "stock": 307
}
```

```json
{
  "row_id": "row_5824054a52",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-8631",
  "raw_title": "ONYX 3 LAPTOP SLEEVE",
  "raw_specs": "14in; neoprene",
  "price": "$214.99",
  "stock": 62
}
```

```json
{
  "row_id": "row_654f1fb60f",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-7575",
  "raw_title": "Onyx 2 action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "$99.99",
  "stock": 359
}
```

```json
{
  "row_id": "row_6f66c4cb9e",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-9136",
  "raw_title": "Onyx Lite action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "$851.99",
  "stock": 370
}
```

```json
{
  "row_id": "row_74b8f7797a",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-4955",
  "raw_title": "Onyx Lite wireless mouse",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "$658.99",
  "stock": 340
}
```

```json
{
  "row_id": "row_a1bb1ad2e9",
  "supplier": "NordicDist",
  "supplier_sku": "NO-5307",
  "raw_title": "Onyx 3 desk lamp",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "£34.99",
  "stock": 19
}
```

```json
{
  "row_id": "row_e571323780",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-1309",
  "raw_title": "Onyx tablet case",
  "raw_specs": "folio; auto sleep/wake",
  "price": "853,99 EUR",
  "stock": 225
}
```

## non-products — development / provisional

Четыре не-товара определены по содержимому: уведомление, тест, пустая запись, смешанный паллет. Stock=0 не является критерием.

Ожидаемые группы: []

Не-товары: ["row_28c6da70ee", "row_7f570b374f", "row_80738b0804", "row_f4de4c72c5"]

Неизвестные пары: []

```json
{
  "row_id": "row_28c6da70ee",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-0000",
  "raw_title": "MIXED PALLET - ASSORTED ELECTRONICS",
  "raw_specs": "untested returns, sold as seen",
  "price": "$450",
  "stock": 0
}
```

```json
{
  "row_id": "row_7f570b374f",
  "supplier": "PacRim Trading",
  "supplier_sku": "PR-XXXX",
  "raw_title": "TEST ROW DO NOT IMPORT",
  "raw_specs": "test",
  "price": "0",
  "stock": 0
}
```

```json
{
  "row_id": "row_80738b0804",
  "supplier": "Direct2Retail",
  "supplier_sku": "D2R-NULL",
  "raw_title": "",
  "raw_specs": "",
  "price": "",
  "stock": 0
}
```

```json
{
  "row_id": "row_f4de4c72c5",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-0001",
  "raw_title": "*** PRICE DROP *** see attached sheet",
  "raw_specs": "",
  "price": "",
  "stock": 0
}
```

## freshcrate — holdout / provisional

Отложенный случай: Blend One. Только наблюдаемые признаки, без внешних фактов.

Ожидаемые группы: [["row_cfc9d66ae8"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_cfc9d66ae8",
  "supplier": "Direct2Retail",
  "supplier_sku": "D2R-FC-B1",
  "raw_title": "FreshCrate Blend One Countertop Blender",
  "raw_specs": "800W; 1.5L glass jug; 6 speeds; dishwasher safe",
  "price": "$119.00",
  "stock": 186
}
```

## orbit — holdout / provisional

Отложенный случай: Orbit 7 128GB. Ёмкость сохраняется в идентичности.

Ожидаемые группы: [["row_d8919b722b"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_d8919b722b",
  "supplier": "PacRim Trading",
  "supplier_sku": "PR-ORB7",
  "raw_title": "Orbit 7 Smartphone 128GB",
  "raw_specs": "6.4in OLED, 128GB, 50MP main, 4700mAh",
  "price": "USD 549",
  "stock": 348
}
```

## harbor — holdout / provisional

Отложенное семейство целиком: разные типы/Plus/X отделены; одинаковые smart scale предварительно совпадают, включая два SKU EuroStock.

Ожидаемые группы: [["row_24e49bc1eb", "row_293cd70b33", "row_71fb9c3128"], ["row_4f178f2cd1", "row_fcc5f20edc"], ["row_52a24f8b1b"], ["row_8d784b2c07"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_24e49bc1eb",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-7266",
  "raw_title": "HARBOR SMART SCALE",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "$148.99",
  "stock": 122
}
```

```json
{
  "row_id": "row_293cd70b33",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-5939",
  "raw_title": "Harbor smart scale",
  "raw_specs": "",
  "price": "136,99 EUR",
  "stock": 140
}
```

```json
{
  "row_id": "row_4f178f2cd1",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-8330",
  "raw_title": "Harbor desk lamp",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "$768.99",
  "stock": 456
}
```

```json
{
  "row_id": "row_52a24f8b1b",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-5085",
  "raw_title": "Harbor X USB-C hub",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "USD 35",
  "stock": 184
}
```

```json
{
  "row_id": "row_71fb9c3128",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-4527",
  "raw_title": "Harbor smart scale",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "674,99 EUR",
  "stock": 114
}
```

```json
{
  "row_id": "row_8d784b2c07",
  "supplier": "NordicDist",
  "supplier_sku": "NO-1752",
  "raw_title": "Harbor Plus smart scale",
  "raw_specs": "",
  "price": "£682.99",
  "stock": 69
}
```

```json
{
  "row_id": "row_fcc5f20edc",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-3109",
  "raw_title": "HARBOR DESK LAMP",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "897,99 EUR",
  "stock": 191
}
```

## kestrel — holdout / provisional

Отложенное семейство целиком: типы и варианты раздельны; bookshelf speaker pair 2 включает разные SKU одного поставщика, даже при пустых specs.

Ожидаемые группы: [["row_1b08ede010", "row_f73f37291f"], ["row_4582fae21d", "row_d2fac2ddba"], ["row_5029b0e40e", "row_6f0c3aa377"], ["row_522195dac7"], ["row_60fe207b81"], ["row_648ed14543", "row_e0a6cb6b3f"], ["row_a8a0a10cf2"], ["row_bbaad66b9f"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_1b08ede010",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-2333",
  "raw_title": "KESTREL 2 BOOKSHELF SPEAKER PAIR",
  "raw_specs": "",
  "price": "60,99 EUR",
  "stock": 292
}
```

```json
{
  "row_id": "row_4582fae21d",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-9054",
  "raw_title": "KESTREL X WIRELESS MOUSE",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "$319.99",
  "stock": 409
}
```

```json
{
  "row_id": "row_5029b0e40e",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-5159",
  "raw_title": "Kestrel wireless mouse",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "$36.99",
  "stock": 391
}
```

```json
{
  "row_id": "row_522195dac7",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-9337",
  "raw_title": "Kestrel desk lamp",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "229,99 EUR",
  "stock": 92
}
```

```json
{
  "row_id": "row_60fe207b81",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-4547",
  "raw_title": "Kestrel Lite tablet case",
  "raw_specs": "folio; auto sleep/wake",
  "price": "191,99 EUR",
  "stock": 182
}
```

```json
{
  "row_id": "row_648ed14543",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-9339",
  "raw_title": "KESTREL WIRED EARBUDS",
  "raw_specs": "3.5mm; in-line mic",
  "price": "$456.99",
  "stock": 305
}
```

```json
{
  "row_id": "row_6f0c3aa377",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-7390",
  "raw_title": "Kestrel wireless mouse",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "$847.99",
  "stock": 490
}
```

```json
{
  "row_id": "row_a8a0a10cf2",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-8888",
  "raw_title": "Kestrel Lite smart scale",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "$290.99",
  "stock": 175
}
```

```json
{
  "row_id": "row_bbaad66b9f",
  "supplier": "NordicDist",
  "supplier_sku": "NO-8919",
  "raw_title": "KESTREL TABLET CASE",
  "raw_specs": "",
  "price": "£405.99",
  "stock": 310
}
```

```json
{
  "row_id": "row_d2fac2ddba",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-5114",
  "raw_title": "Kestrel X wireless mouse",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "720,99 EUR",
  "stock": 264
}
```

```json
{
  "row_id": "row_e0a6cb6b3f",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-4366",
  "raw_title": "Kestrel wired earbuds",
  "raw_specs": "3.5mm; in-line mic",
  "price": "897,99 EUR",
  "stock": 366
}
```

```json
{
  "row_id": "row_f73f37291f",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-2508",
  "raw_title": "Kestrel 2 bookshelf speaker pair",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "521,99 EUR",
  "stock": 210
}
```

## torrent — holdout / provisional

Отложенное семейство целиком: типы/варианты раздельны; несколько X bookshelf speaker pair предварительно один товар; stock не суммировать.

Ожидаемые группы: [["row_3c159f1aea", "row_ca51ad691e", "row_decc7f2137", "row_f35a2ab58f"], ["row_4a8b5dc2b1", "row_a4c85dc257"], ["row_5609f5b65d"], ["row_8dfa59e7c2", "row_aef34b7f58"], ["row_aa3fa28de4"], ["row_fd1f97e32c"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_3c159f1aea",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-2724",
  "raw_title": "TORRENT X BOOKSHELF SPEAKER PAIR",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "284,99 EUR",
  "stock": 277
}
```

```json
{
  "row_id": "row_4a8b5dc2b1",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-4003",
  "raw_title": "Torrent desk lamp",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "$140.99",
  "stock": 133
}
```

```json
{
  "row_id": "row_5609f5b65d",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-5519",
  "raw_title": "Torrent tablet case",
  "raw_specs": "folio; auto sleep/wake",
  "price": "$536.99",
  "stock": 348
}
```

```json
{
  "row_id": "row_8dfa59e7c2",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-1514",
  "raw_title": "Torrent Lite laptop sleeve",
  "raw_specs": "14in; neoprene",
  "price": "$681.99",
  "stock": 487
}
```

```json
{
  "row_id": "row_a4c85dc257",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-4714",
  "raw_title": "Torrent desk lamp",
  "raw_specs": "LED; 5 colour temps; USB-C",
  "price": "USD 153",
  "stock": 282
}
```

```json
{
  "row_id": "row_aa3fa28de4",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-4052",
  "raw_title": "TORRENT LITE WIRED EARBUDS",
  "raw_specs": "3.5mm; in-line mic",
  "price": "167,99 EUR",
  "stock": 440
}
```

```json
{
  "row_id": "row_aef34b7f58",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-3827",
  "raw_title": "TORRENT LITE LAPTOP SLEEVE",
  "raw_specs": "14in; neoprene",
  "price": "USD 879",
  "stock": 226
}
```

```json
{
  "row_id": "row_ca51ad691e",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-2336",
  "raw_title": "Torrent X bookshelf speaker pair",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "618,99 EUR",
  "stock": 295
}
```

```json
{
  "row_id": "row_decc7f2137",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-8495",
  "raw_title": "Torrent X bookshelf speaker pair",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "$658.99",
  "stock": 226
}
```

```json
{
  "row_id": "row_f35a2ab58f",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-2369",
  "raw_title": "Torrent X bookshelf speaker pair",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "USD 458",
  "stock": 84
}
```

```json
{
  "row_id": "row_fd1f97e32c",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-2171",
  "raw_title": "TORRENT 2 MICROSD CARD 256GB",
  "raw_specs": "UHS-I; A2; up to 170MB/s",
  "price": "USD 308",
  "stock": 316
}
```

## basalt — holdout / provisional

Отложенное семейство целиком: типы, Lite/Pro/2 отделены даже при одинаковых шаблонных specs.

Ожидаемые группы: [["row_07d0ec92f5", "row_48143816e9"], ["row_185aeac60e", "row_894eb0e4a9"], ["row_24f8ce8414"], ["row_35c28ff0d0", "row_ceb27e8382"], ["row_3a68411ed8"], ["row_5a0b7faba6", "row_6a281bc385"], ["row_6fff6aa632", "row_a453c69dab"], ["row_7b5442e7cc", "row_d01593ee00"], ["row_a661bdf24e"], ["row_d440c7c5af"], ["row_e1124c3b3f"]]

Не-товары: []

Неизвестные пары: []

```json
{
  "row_id": "row_07d0ec92f5",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-7654",
  "raw_title": "BASALT LITE TABLET CASE",
  "raw_specs": "folio; auto sleep/wake",
  "price": "USD 454",
  "stock": 487
}
```

```json
{
  "row_id": "row_185aeac60e",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-2600",
  "raw_title": "Basalt 2 laptop sleeve",
  "raw_specs": "14in; neoprene",
  "price": "USD 758",
  "stock": 145
}
```

```json
{
  "row_id": "row_24f8ce8414",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-8587",
  "raw_title": "Basalt 2 wireless mouse",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "USD 345",
  "stock": 13
}
```

```json
{
  "row_id": "row_35c28ff0d0",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-7380",
  "raw_title": "BASALT 2 MICROSD CARD 256GB",
  "raw_specs": "UHS-I; A2; up to 170MB/s",
  "price": "USD 268",
  "stock": 9
}
```

```json
{
  "row_id": "row_3a68411ed8",
  "supplier": "NordicDist",
  "supplier_sku": "NO-1917",
  "raw_title": "Basalt 2 action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "£581.99",
  "stock": 497
}
```

```json
{
  "row_id": "row_48143816e9",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-2589",
  "raw_title": "Basalt Lite tablet case",
  "raw_specs": "folio; auto sleep/wake",
  "price": "$141.99",
  "stock": 164
}
```

```json
{
  "row_id": "row_5a0b7faba6",
  "supplier": "NordicDist",
  "supplier_sku": "NO-7325",
  "raw_title": "Basalt Pro action camera",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "£625.99",
  "stock": 318
}
```

```json
{
  "row_id": "row_6a281bc385",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-4508",
  "raw_title": "BASALT PRO ACTION CAMERA",
  "raw_specs": "4K60; waterproof to 10m",
  "price": "228,99 EUR",
  "stock": 355
}
```

```json
{
  "row_id": "row_6fff6aa632",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-2266",
  "raw_title": "BASALT USB-C HUB",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "USD 734",
  "stock": 138
}
```

```json
{
  "row_id": "row_7b5442e7cc",
  "supplier": "Direct2Retail",
  "supplier_sku": "DI-3133",
  "raw_title": "Basalt Pro bookshelf speaker pair",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "$423.99",
  "stock": 495
}
```

```json
{
  "row_id": "row_894eb0e4a9",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-8813",
  "raw_title": "Basalt 2 laptop sleeve",
  "raw_specs": "14in; neoprene",
  "price": "$640.99",
  "stock": 182
}
```

```json
{
  "row_id": "row_a453c69dab",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-2499",
  "raw_title": "Basalt USB-C hub",
  "raw_specs": "7-in-1; HDMI 4K30; 100W PD passthrough",
  "price": "756,99 EUR",
  "stock": 15
}
```

```json
{
  "row_id": "row_a661bdf24e",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-2855",
  "raw_title": "Basalt 2 tablet case",
  "raw_specs": "folio; auto sleep/wake",
  "price": "517,99 EUR",
  "stock": 210
}
```

```json
{
  "row_id": "row_ceb27e8382",
  "supplier": "NordicDist",
  "supplier_sku": "NO-9573",
  "raw_title": "Basalt 2 microSD card 256GB",
  "raw_specs": "UHS-I; A2; up to 170MB/s",
  "price": "£860.99",
  "stock": 441
}
```

```json
{
  "row_id": "row_d01593ee00",
  "supplier": "EuroStock GmbH",
  "supplier_sku": "EU-9754",
  "raw_title": "Basalt Pro bookshelf speaker pair",
  "raw_specs": "40W; passive; 4 ohm",
  "price": "106,99 EUR",
  "stock": 260
}
```

```json
{
  "row_id": "row_d440c7c5af",
  "supplier": "clearance-lots",
  "supplier_sku": "CL-7611",
  "raw_title": "BASALT PRO WIRELESS MOUSE",
  "raw_specs": "2.4GHz + BT; 6 buttons; 70g",
  "price": "$445.99",
  "stock": 148
}
```

```json
{
  "row_id": "row_e1124c3b3f",
  "supplier": "PacRim Trading",
  "supplier_sku": "PA-6853",
  "raw_title": "Basalt smart scale",
  "raw_specs": "BIA; app sync; 180kg max",
  "price": "USD 559",
  "stock": 439
}
```


## Дополнение этапа 3 — не проверено человеком

`stage3-checks.json` фиксирует 12 development-строк и полный ожидаемый набор из 11 дополнений пяти поддержанных типов. Набор подготовлен AI до live-эксперимента и имеет статус provisional. Он отдельно от исходных matching labels и 52 проверок этапа 2. Тип/категория немецкого AeroBuds остаются unknown/other: название модели само по себе не является явным указанием типа; две unknown-связи matching не изменены. Набор не включает holdout.

При человеческой проверке отдельно проверить предмет/ограничители, radio_link для 2.4GHz, число температур света, число размеров и полный target совместимости. Положительные ожидаемые дополнения и отрицательные/пустые результаты должны проверяться вместе. Результаты искусственного адаптера не являются hand-labeling или свидетельством качества модели.

## Этап 4 — controlled claims, ожидает проверки

`stage4-claims.json` содержит 12 development-примеров: семь поддержанных claims, четыре неподтверждённых и один спорный/incomparable. Искусственные искажения проверяют другое число, чужой аксессуар, снятый `up to`, перенос OPEN BOX с предложения на товар и неподтверждённый смысл 12 W. Они не являются оценкой естественной частоты галлюцинаций.

Проверьте каждый `expectedVerdict` и rationale по указанной строке, всем строкам её B1-товара, accepted/reconciled facts и evidence. Не используйте внешний каталог. После проверки замените `status` на `human_verified`, заполните `reviewedBy` и ISO-дату `reviewedAt`; содержание случаев после этого считается замороженным. До этого verifier-метрики остаются provisional, а full B3 запрещён процессом этапа.

Development B3 создаёт рядом с run шаблон `generated-review.json`. Актуальный контракт v2 хранит все опубликованные claims, но проверку считает только по явному `state`: для `reviewed` обязательны выбранный человеком `humanVerdict` и непустой rationale; model verdict из результата не предзаполняет человеческое решение. Неудобную формулировку отмечайте `unclear_copy`, неатомарную границу — `non_atomic_claim`; если сами факты совпадают с фидом, оставляйте factual verdict `supported`.

Gate использует заранее зафиксированные `sampleProductIds`: нужно полностью проверить все claims как минимум 20 выбранных карточек, а не все 158 claims. Файл всё равно обязан точно покрывать опубликованные claims по `productId + attempt + claimId` и совпадать с `publicationHash`. Текущая каноническая разметка — `generated-review-e478435a3d39.json`: 120/158 claims, 28/37 карточек и 20/20 карточек обязательной выборки. Все factual verdict подтверждены по supplier feed; четыре неатомарных span и две неясные copy-формулировки сохранены как отдельные измеренные ограничения. Оставшиеся 38 pending claims размечать не требуется.
