declare module 'react-native-razorpay' {
  const RazorpayCheckout: {
    open(options: object): Promise<unknown>;
  };

  export default RazorpayCheckout;
}
