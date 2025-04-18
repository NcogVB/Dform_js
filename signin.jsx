"use client";
 import React, { useEffect } from "react";
 import React, { useEffect, useState } from "react";
 import Cookies from "universal-cookie";
 
 import Loader from "@components/uiComponents/loader/Loader";
 
 import { login } from "@/server/Server";
 import { connectWallet } from "@web3Contract/WalletLogin";
 import { connectWallet, getCurrentWalletState, WALLET_STATES } from "@web3Contract/WalletLogin";
 import { ToastPopup } from "@components/UIComponents/Toast";
 import { getUserDetailsForWallet } from "@web3Contract/Web3Helper";
 
 import DFormIcon from "@assets/images/dform_logo.png";
 
 const SignIn = () => {
     const cookie = new Cookies();
     const [loading, setLoading] = React.useState(false);
     const [userDetails, setUserDetails] = React.useState([]);
     const [loading, setLoading] = useState(false);
     const [userDetails, setUserDetails] = useState([]);
     const [walletState, setWalletState] = useState(WALLET_STATES.DISCONNECTED);
     const [error, setError] = useState("");
 
     useEffect(() => {
         const getUserDetails = async () => {
     const getUserDetails = async (bypassCache = false) => {
         try {
             setLoading(true);
             setError("");
             
             const accounts = await connectWallet();
             const userDetails = await getUserDetailsForWallet(accounts);
             if (userDetails?.length) {
                 setUserDetails(userDetails);
             } else {
                 setUserDetails([]);
             if (!accounts) {
                 setError("Failed to connect wallet");
                 return;
             }
 
             const details = await getUserDetailsForWallet(accounts, bypassCache);
             setUserDetails(details?.length ? details : []);
             setWalletState(getCurrentWalletState());
             
             if (!details?.length) {
                 setError("No accounts found for this wallet. Please sign up first.");
             }
         } catch (error) {
             console.error("Error fetching user details:", error);
             setError("Failed to fetch user details");
         } finally {
             setLoading(false);
         }
     };
 
         setTimeout(() => {
             getUserDetails();
         }, 1000);
     useEffect(() => {
         const initializeWallet = async () => {
             if (window?.ncogProvider) {
                 await getUserDetails();
 
                 // Setup wallet state listeners
                 window.ncogProvider.on("accountsChanged", async () => {
                     await getUserDetails(true); // Bypass cache on account change
                 });
 
         if (window?.ncogProvider) {
             window?.ncogProvider.on("accountsChanged", async () => {
                 await getUserDetails();
                 window.location.reload();
             });
         }
                 window.ncogProvider.on("disconnect", () => {
                     setUserDetails([]);
                     setWalletState(WALLET_STATES.DISCONNECTED);
                     // Clear all auth data
                     cookie.remove('userDetails');
                     cookie.remove('accessToken');
                     localStorage.removeItem('userDetails');
                     localStorage.removeItem('accessToken');
                 });
             }
         };
 
         initializeWallet();
     }, []);
 
     const loginUser = async (user) => {
         setLoading(true);
         try {
             console.log('user', user);
             setLoading(true);
             setError("");
             
             const response = await login(user?.userName, user?.publicKey);
             
             if (!response?.isAccess && !response.isAuth) {
                 ToastPopup('error', response?.message || "You are not authorized to access this account. Please contact your administrator for assistance");
                 setError(response?.message || "Authorization failed");
                 // Clear auth data on failed login
                 cookie.remove('userDetails');
                 cookie.remove('accessToken');
                 localStorage.removeItem('userDetails');
                 return true;
             } else if (response?.token) {
                 console.log('response?.token', response?.token);
                 localStorage.removeItem('accessToken');
                 return;
             }
 
             if (response.token) {
                 // Store auth data
                 cookie.set('accessToken', response.token, { path: '/', sameSite: 'lax', secure: true });
                 localStorage.setItem('accessToken', response.token);
                 
                 // Process and store user data
                 const userObject = {};
                 Object.keys(user)?.forEach((key) => {
                 Object.keys(user).forEach((key) => {
                     if (isNaN(key)) {
                         userObject[key] = typeof user[key] === 'bigint' ? user[key].toString() : user[key];
                         userObject[key] = typeof user[key] === 'bigint' 
                             ? user[key].toString() 
                             : user[key];
                     }
                 });
 
                 cookie.set('userDetails', userObject);
                 localStorage.setItem('userDetails', userObject);
                 // window.open(`/document`, "_self");
             } else {
                 ToastPopup('error', "Something went wrong.");
                 localStorage.setItem('userDetails', JSON.stringify(userObject));
                 
                 window.open("/document", "_self");
             }
         } catch (error) {
             console.log('error', error);
             ToastPopup('error', "Something went wrong.");
             console.error("Login error:", error);
             setError("Failed to login");
         } finally {
             setLoading(false);
         }
     }
     };
 
     return (
         <div className="flex items-center justify-center min-h-screen">
             <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-6">
                 <div className="mt-4 flex gap-2 items-center justify-center">
                     <img src={DFormIcon} width={30} height={30} />
                     <h4 className="text-xl font-semibold"> DForms </h4>
         <div className="flex items-center justify-center min-h-screen flex-col gap-8">
             <div className="flex justify-center w-full max-w-[650px] rounded-lg shadow-md py-10 px-[100px] flex-col gap-8">
                 <div className="flex justify-center items-center flex-col gap-4">
                     <img src={DFormIcon} alt="DForm Logo" className="w-16 h-16" />
                     <h3 className="text-[26px] font-bold">Welcome Back!</h3>
                     <p className="text-sm text-center">
                         Connect your wallet and choose your account to continue
                     </p>
                 </div>
 
                 <h2 className="text-xl font-semibold text-center mt-4">
                     {userDetails?.length ? "Choose an account" : "Create an account"}
                 </h2>
                 <p className="text-center text-gray-500 text-sm">
                     to continue to <span className="font-semibold">DForms</span>
                 </p>
 
                 <div className="mt-6 flex flex-col gap-4">
                     <div className="account-list-section space-y-4 overflow-hidden overflow-y-auto max-h-[400px] pr-2">
                         {userDetails?.map((user) => (
                 {loading ? (
                     <div className="flex justify-center">
                         <Loader />
                     </div>
                 ) : (
                     <div className="space-y-4">
                         {error && (
                             <p className="text-red-500 text-sm text-center">{error}</p>
                         )}
                         
                         {userDetails?.length > 0 ? (
                             <div className="space-y-3">
                                 {userDetails.map((user) => (
                                     <button
                                         key={user?.userId}
                                         className="w-full flex items-center px-4 py-2 border border-[#E9EAEB] rounded-lg hover:bg-gray-100 transition"
                                         onClick={() => loginUser(user)}
                                         disabled={loading}
                                     >
                                         <div className="flex items-center space-x-3">
                                             <div className="w-8 h-8 flex items-center justify-center bg-gray-300 text-gray-700 font-bold rounded-full">
                                                 <div className="user-profile-pic">
                                                     {user?.name?.charAt(0)?.toUpperCase()}
                                                 </div>
                                             </div>
                                             <div className="text-left">
                                                 <p className="text-sm font-medium">{user?.name}</p>
                                                 <p className="text-xs text-gray-500">{user?.userName}</p>
                                             </div>
                                         </div>
                                     </button>
                                 ))}
                             </div>
                         ) : (
                             <button
                                 key={user?.userId}
                                 className="w-full flex items-center px-4 py-2 border border-[#E9EAEB] rounded-lg hover:bg-gray-100 transition"
                                 onClick={() => loginUser(user)}
                                 onClick={() => getUserDetails()}
                                 className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                 disabled={loading}
                             >
                                 <div className="flex items-center space-x-3">
                                     <div className="w-8 h-8 flex items-center justify-center bg-gray-300 text-gray-700 font-bold rounded-full">
                                         <div className="user-profile-pic">{user?.name?.charAt(0)?.toUpperCase()}</div>
                                     </div>
                                     <div className="text-left">
                                         <p className="text-sm font-medium">{user?.name}</p>
                                         <p className="text-xs text-gray-500">{user?.userName}</p>
                                     </div>
                                 </div>
                                 Connect Wallet
                             </button>
                         ))}
                     </div>
                     <div>
                         <button
                             onClick={() => window.open("/signUp", "_self")}
                             className="w-[98%] flex items-center px-4 py-2 border border-[#E9EAEB] rounded-lg hover:bg-gray-100 transition"
                         >
                             <div className="flex items-center space-x-3">
                                 <div className="w-8 h-8 flex items-center justify-center text-gray-500 border border-[#E9EAEB] font-bold rounded-full">
                                     +
                                 </div>
                                 <p className="text-sm font-medium text-gray-500">
                                     {userDetails?.length ? "Use another account" : "Create new account"}
                                 </p>
                             </div>
                         </button>
                         )}
                         
                         <div>
                             <button
                                 onClick={() => window.open("/signUp", "_self")}
                                 className="w-full px-4 py-2 text-blue-600 hover:text-blue-700 transition"
                             >
                                 Create New Account
                             </button>
                         </div>
                     </div>
                 </div>
                 )}
             </div>
             {loading && (
                 <div className="absolute top-0 left-0 w-full h-full bg-[rgba(0,0,0,0.32)] z-50 flex justify-center items-center">
                     <Loader isMain={true} fullLoader={true} />
                 </div>
             )}
         </div>
     );
 };