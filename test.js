// @param {string} param1, param2, param3, param4
// @returns {string}
function handler(param1, param2, param3, param4) {
  // Add your custom logic here
  return {
    ref: "main",
    inputs: {
      request_id: param4,
      TITLE: `⏱ PHIẾU PHẠT ĐI MUỘN VỀ SỚM THÁNG ${param3}`,
      MESSAGE_TEXT: param1,
      OU_ID: "ou_bf3344a1d486204141e34cbc44459a02",
    },
  };
}
