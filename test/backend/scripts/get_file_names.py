"""Utility to get file names that match a glob string pattern from the root folder"""


import pathlib
from typing import List

ROOT_PATH = pathlib.Path(__file__).parent.parent.parent.parent.resolve()


def get_file_names(glob_str: str, extension: bool = True) -> List[str]:
    """Returns a list with the name of all the files that match glob_str"""
    if extension:
        return sorted([p.name for p in ROOT_PATH.glob(glob_str)])

    return sorted([p.stem for p in ROOT_PATH.glob(glob_str)])
