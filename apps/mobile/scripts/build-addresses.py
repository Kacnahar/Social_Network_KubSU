#!/usr/bin/env python3
"""Собирает компактный список адресов для подсказок в форме «Сдать жильё».

Берёт архив «Адреса_Краснодар_Новая_Адыгея.zip» (выгрузка государственного адресного реестра: CSV через «;», UTF-8)
и оставляет только «улица + дом»: без квартир, помещений, комнат, машино-мест. Повторы убирает, дома сортирует.

Запуск:  python3 scripts/build-addresses.py /путь/к/архиву.zip
Результат: assets/data/addresses.json (улицы с домами) и assets/data/streets.json (уникальные улицы без домов).
Исходный архив не меняется.
"""
import csv
import io
import json
import re
import sys
import zipfile
from pathlib import Path

csv.field_size_limit(10**8)

CITIES = [
    # (папка в архиве, название в подсказках, начало сокращённого адреса)
    ("Краснодар", "Краснодар", "Краснодарский край, г.о. город Краснодар, г. Краснодар, "),
    ("Новая_Адыгея", "Новая Адыгея", "Республика Адыгея (Адыгея), м.р-н Тахтамукайский, с.п. Старобжегокайское, п. Новая Адыгея, "),
]
# Типы строк «здания», которые считаем домами
HOUSE_TYPES = {"Дом", "Домовладение", "Здание"}
# Сокращения, с которых начинается название улицы
STREET_TYPES = ("ул.", "пр-д", "пер.", "пр-кт", "б-р", "пл.", "туп.", "ш.", "наб.", "ал.", "с-р", "дор.", "проезд", "линия")
HOUSE_PREFIX = re.compile(r"^(д\.|двлд\.|зд\.)\s+(.+)$")


def decode(name: str) -> str:
    try:
        return name.encode("cp437").decode("utf-8")
    except Exception:
        return name


def read_csv(z: zipfile.ZipFile, info: zipfile.ZipInfo):
    with z.open(info) as raw:
        text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
        reader = csv.reader(text, delimiter=";")
        next(reader)
        for row in reader:
            if len(row) >= 6:
                yield row


def is_street(segment: str) -> bool:
    return segment.startswith(STREET_TYPES)


def split_street(rest: str):
    """«тер. СНТ Х, ул. Центральная» → (территория «тер. СНТ Х», улица «ул. Центральная»); None, если улицы нет."""
    parts = [p.strip() for p in rest.split(", ")]
    for i, part in enumerate(parts):
        if is_street(part):
            return ", ".join(parts[:i]), part
    return None


def natural_key(house: str):
    m = re.match(r"(\d+)(.*)", house)
    return (0, int(m.group(1)), m.group(2)) if m else (1, 0, house)


def main(zip_path: str) -> None:
    out_dir = Path(__file__).resolve().parent.parent / "assets" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    z = zipfile.ZipFile(zip_path)
    infos = {decode(i.filename): i for i in z.infolist()}

    streets = {}  # (город, территория, улица) -> множество домов
    raw_buildings = 0
    for city_index, (folder, _label, prefix) in enumerate(CITIES):
        streets_info = next(i for n, i in infos.items() if f"/{folder}/" in n and n.endswith("1_адресообразующие_элементы.csv"))
        houses_info = next(i for n, i in infos.items() if f"/{folder}/" in n and n.endswith("2_здания.csv"))
        # Все улицы (в том числе без домов)
        for row in read_csv(z, streets_info):
            short = row[5]
            if not short.startswith(prefix):
                continue
            found = split_street(short[len(prefix):])
            if found:
                streets.setdefault((city_index, found[0], found[1]), set())
        # Дома
        for row in read_csv(z, houses_info):
            raw_buildings += 1
            if row[2] not in HOUSE_TYPES or not row[5].startswith(prefix):
                continue
            rest = row[5][len(prefix):]
            parts = [p.strip() for p in rest.split(", ")]
            house_match = HOUSE_PREFIX.match(parts[-1]) if parts else None
            found = split_street(", ".join(parts[:-1])) if house_match else None
            if not house_match or not found:
                continue
            house = re.sub(r"\s+", " ", house_match.group(2)).strip()
            if re.search(r"\b(кв|оф|пом|комн)\.", house):
                continue
            streets.setdefault((city_index, found[0], found[1]), set()).add(house)

    ordered = sorted(streets.items(), key=lambda kv: (kv[0][0], kv[0][2].lower(), kv[0][1].lower()))
    # addresses.json: [название улицы, номер города, территория, "дом|дом|…"]
    addresses = {
        "v": 1,
        "cities": [c[1] for c in CITIES],
        "streets": [[key[2], key[0], key[1], "|".join(sorted(houses, key=natural_key))] for key, houses in ordered],
    }
    streets_only = {
        "v": 1,
        "cities": [c[1] for c in CITIES],
        "streets": [[key[2], key[0], key[1]] for key, _ in ordered],
    }
    (out_dir / "addresses.json").write_text(json.dumps(addresses, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (out_dir / "streets.json").write_text(json.dumps(streets_only, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total_houses = sum(len(h) for h in streets.values())
    with_houses = sum(1 for h in streets.values() if h)
    base_names = {k[2] for k in streets}
    print(f"зданий в файлах: {raw_buildings}")
    print(f"улиц (с учётом территорий): {len(streets)}, из них с домами: {with_houses}; разных названий улиц: {len(base_names)}")
    print(f"адресов «улица + дом» без повторов: {total_houses}")
    for name in ("addresses.json", "streets.json"):
        print(name, (out_dir / name).stat().st_size, "байт")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
