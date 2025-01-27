import json
import click

@click.command()
@click.argument('files', nargs=-1)
@click.option('--output', '-o', required=True, help='Output file')
def merge_json(files, output):
    with open(files[0], 'r') as base_file:
        base = json.load(base_file)

    for file in files[1:]:
        with open(file, 'r') as file:
            data = json.load(file)
            base.update(data)

    with open(output, 'w+') as merged_file:
        json.dump(base, merged_file, indent=4)


if __name__ == "__main__":
    merge_json()