export const handler = async (event: any) => {
  return { success: true, message: "API連携成功", transactionId: `TX-${Date.now()}` };
};
