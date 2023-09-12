"""Utility to run 'make' from python as a subprocess"""

import subprocess
import pathlib
from typing import Optional

ROOT_PATH = pathlib.Path(__file__).parent.parent.parent.parent.resolve()


def make(
    arg: str,
    capture_output: bool = False,
    print_captured_output: bool = False,
    cwd: Optional[pathlib.Path] = None,
) -> str:
    """Runs 'make --no-print-directory arg' with following behavior, so we can
    use it in our sequential CI/CD pipeline:

    Example usage:
        import sys
        import subprocess
        try:
            v = 10
            make(f"name_of_a_phony_Makefile_target SOME_VARIABLE={v}")
        except subprocess.CalledProcessError as e:
            sys.exit(e.returncode)

    Parameters:
        arg: the shell command will be: 'make --no-print-directory arg'

        capture_output:
            False (default) - Returns ""
            True            - Returns captured stdout+stderr
                              Blocks! Cannot be used to start a background process

        print_captured_output:
            Only used when capture_output=True
            False (default) - Does NOT print output if all runs ok
                              If an error occurs, it will print it
            True            - Prints output while running

    Explanation:
        - Runs make as a shell command, as if run from the command line
        - Runs from the root folder of the repository, where the Makefile is located
          (You can specify an alternative folder with 'cwd=...' argument)
        - Prints the combined stdout & stderr, while it is running

        - If no error occurs:
          - if capture_output=True, returns the captured combination of stdout & stderr
          - else, returns ""
        - If an error occurs:
          - Throws a subprocess.CalledProcessError as e:
            return e.returncode
    """

    cmd = f"make --no-print-directory {arg}"
    if cwd is None:
        cwd = ROOT_PATH

    capture_stdout = ""

    if capture_output is False:
        subprocess.run(cmd, shell=True, check=True, text=True, cwd=cwd)
    else:
        # These will block & cannot be used to start a background process from make.
        if print_captured_output is False:
            # This will capture_output and:
            # - return it if there is no error
            # - print it only if there is an error
            p_1 = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                check=False,
                text=True,
                cwd=cwd,
            )
            if p_1.returncode != 0:
                print(p_1.stdout)
                raise subprocess.CalledProcessError(p_1.returncode, p_1.args)
            capture_stdout += p_1.stdout
        else:
            # This printss output while running, and we capture it as well & return it
            # https://stackoverflow.com/a/28319191/5480536
            with subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                bufsize=1,
                universal_newlines=True,
                cwd=cwd,
            ) as p_2:
                if p_2.stdout is not None:
                    for line in p_2.stdout:
                        print(line, end="")
                        capture_stdout += line
            if p_2.returncode != 0:
                raise subprocess.CalledProcessError(p_2.returncode, p_2.args)
    return capture_stdout
