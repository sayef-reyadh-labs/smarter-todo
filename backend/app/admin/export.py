# CSV export for the admin lists: UTF-8 with a byte order mark (so Excel reads it), formula-safe cells.
import csv
import io
from typing import Iterable

MAX_EXPORT_ROWS = 10_000

# A cell that starts with one of these is a formula in Excel and Sheets; the apostrophe keeps it plain text.
_FORMULA_STARTS = ("=", "+", "-", "@", "\t", "\r")


def _cell(value: object) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.startswith(_FORMULA_STARTS) else text


def to_csv(headers: list[str], rows: Iterable[Iterable[object]]) -> str:
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([_cell(value) for value in row])
    return "\ufeff" + out.getvalue()
