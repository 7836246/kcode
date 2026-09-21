export const CLI_COMMAND_NAME = "kcode";
export const CLI_PROCESS_NAME = "kcode-cli";

interface ProcessTitleTarget {
  title: string;
}

export const setCliProcessTitle = (
  target: ProcessTitleTarget = process,
): void => {
  target.title = CLI_PROCESS_NAME;
};
