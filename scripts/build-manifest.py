import json
import click
from typing import Literal
from pathlib import Path

def get_manifest(source: Path, scope: str):
    manifest_path = source / "manifest" / f"manifest.{scope}.json"
    return json.load(open(manifest_path))


# def replace_host_in_list(data: list):
#     arr = []
#     for item in data:
#         if isinstance(item, list):
#             arr.append(replace_host_in_list(item))
#             continue
#         if isinstance(item, str):
#             if "[HOST]" not in item:
#                 arr.append(item)
#                 continue
#             for host in HOSTS:
#                 arr.append(item.replace("[HOST]", host))
#                 continue
#         if isinstance(item, dict):
#             arr.append(replace_host_in_dict(item))
#             continue
#     return arr


# def replace_host_in_dict(data: dict):
#     for key, value in data.items():
#         if isinstance(value, list):
#             data[key] = replace_host_in_list(value)
#             continue
#         if isinstance(value, str):
#             if "[HOST]" not in value:
#                 continue
#             raise ValueError(f"Host not found in {value}")
#         if isinstance(value, dict):
#             data[key] = replace_host_in_dict(value)
#             continue
#     return data


@click.command()
@click.argument("browser", required=True)
@click.argument("source", required=True, type=click.Path(exists=True))
def build_manifest(browser: Literal["firefox", "chrome"], source: Path):
    source = Path(source)
    manifest = get_manifest(source, "base")
    manifest.update(get_manifest(source, browser))

    with open(source / "manifest.json", "w+") as output_file:
        json.dump(manifest, output_file, indent=4)


if __name__ == "__main__":
    build_manifest()
