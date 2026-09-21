export const CUA_REQUEST_ACCESS_STATUS_META_KEY = "kcode.cua/request-access-status-v1";

export const cuaRequestAccessStatusSchema = {
  safeParse(_input) {
    return {
      success: false,
      error: new Error("Computer Use is not available in this build."),
    };
  },
};
