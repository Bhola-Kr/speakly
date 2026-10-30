declare module 'payu-non-seam-less-react' {
  type PayUSdk = {
    openCheckoutScreen(payment: Record<string, unknown>): void;
    hashGenerated(hashes: Record<string, string>): void;
    makeHttpRequest(
      url: string,
      method: string,
      body: string,
      headers: Record<string, string>,
    ): Promise<string | Record<string, unknown>>;
  };

  const PayUBizSdk: PayUSdk;
  export default PayUBizSdk;
}
