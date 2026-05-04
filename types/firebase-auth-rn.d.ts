declare module 'papaparse' {
  const Papa: any;
  export default Papa;
}

declare module '@firebase/auth/dist/rn/index.js' {
  export const getAuth: any;
  export const initializeAuth: any;
  export const connectAuthEmulator: any;
  export const getReactNativePersistence: any;
}
