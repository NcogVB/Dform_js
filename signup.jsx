import { Button } from "@components/uiComponents/Button";
 import { ToastPopup } from "@components/uiComponents/Toast";
 import { userContractABI } from "@web3Contract/UserContractABI";
 import { getPublicKeyValue, getUserDetailsForWallet, transactionAction } from "@web3Contract/Web3Helper";
 import { getPublicKeyValue, getUserDetailsForWallet, transactionAction, TX_STATUS } from "@web3Contract/Web3Helper";
 
 export default function SignUp() {
     const cookie = new Cookies();
 @@ -16,81 +16,123 @@ export default function SignUp() {
     const [address, setAddress] = useState("");
     const [loading, showLoader] = useState(false);
     const [isWalletConnected, setIsWalletConnected] = useState(false);
     const [transactionStatus, setTransactionStatus] = useState("");
 
     const handleConnectWallet = async () => {
         try {
             const accounts = await window?.ncogProvider.request({
                 method: "ncog_accounts",
             });
             console.log('accounts', accounts?.selectedAccount?.accountAddress);
             setAddress(accounts?.selectedAccount?.accountAddress);
             if (!accounts?.selectedAccount?.accountAddress) {
                 throw new Error("No wallet account found");
             }
             setAddress(accounts.selectedAccount.accountAddress);
             setIsWalletConnected(true);
             
             // Check if user already exists for this wallet
             const existingUsers = await getUserDetailsForWallet(accounts.selectedAccount.accountAddress);
             if (existingUsers?.length) {
                 setError("This wallet already has associated accounts. Please use Sign In.");
                 return;
             }
         } catch (error) {
             setError((error).message);
             setError(error.message || "Failed to connect wallet");
             setIsWalletConnected(false);
         }
     };
 
     const validateUsername = (username) => {
         if (!username) return "Username is required";
         if (username.length < 3) return "Username must be at least 3 characters long";
         if (!/^[a-zA-Z0-9._]+$/.test(username)) {
             return "Sorry, only letters (a-z), numbers (0-9), and periods (. and _) are allowed.";
         }
         return null;
     };
 
     const handleSubmit = async (e) => {
         e.preventDefault();
         try {
             const validationError = validateUsername(user);
             if (validationError) {
                 setError(validationError);
                 return;
             }
 
             showLoader(true);
             setTransactionStatus("Checking username availability...");
             
             const web3 = new Web3(import.meta.env.VITE_RPC_URL);
             const hostContract = new web3.eth.Contract(userContractABI, import.meta.env.VITE_USER_CONTRACT);
             
             const value = await hostContract.methods.getPublicKeyOfUser(user + "@" + import.meta.env.VITE_PUBLIC_DOMAIN).call({ from: address });
             const result = !!value === true ? 'Username Is not Available' : false;
             if (result) {
             if (!!value === true) {
                 setError("Username is not available");
                 return;
             }
             if (!/^[a-zA-Z0-9._]+$/.test(user)) {
                 setError("Sorry, only letters (a-z), numbers (0-9), and periods (. and _) are allowed.");
                 return;
             }
 
             setTransactionStatus("Getting public key...");
             const publicKey = await getPublicKeyValue(address);
             if (!publicKey) {
                 setError("Public key not found");
                 return;
             }
 
             const userName = user + '@' + import.meta.env.VITE_PUBLIC_DOMAIN;
             const functionParams = ["", "", userName, import.meta.env.VITE_PUBLIC_DOMAIN, user, publicKey, address, true, []];
             
             setTransactionStatus("Creating account...");
             const hash = await transactionAction(hostContract, "createAccount", functionParams, address, true);
             if (!hash) {
                 setError("Transaction failed");
                 return;
             }
             const userDetails = await getUserDetailsForWallet(address);
             if(userDetails?.length){
                 const LoginUsers = userDetails?.filter((user)=> user?.userName === userName )
                 const response = await login(userName, publicKey);
                 if (!response?.isAccess && !response.isAuth) {
                     ToastPopup('error', response?.message || "You are not authorized to access this account. Please contact your administrator for assistance");
                     cookie.remove('userDetails');
                     cookie.remove('accessToken');
                     localStorage.removeItem('userDetails');
                     localStorage.removeItem('accessToken');
                     window.open(`/`, "_self");
                     return true;
                 } else if (response.token) {
                     cookie.set('accessToken', response.token, { path: '/', sameSite: 'lax', secure: true });
                     localStorage.setItem('accessToken', response.token);
                     const userObject = {};
                     Object.keys(LoginUsers)?.forEach((key) => {
                         if (isNaN(key)) {
                             userObject[key] = typeof user[key] === 'bigint' ? user[key].toString() : user[key];
                         }
                     });                    
                     cookie.set('userDetails', userObject );
                     localStorage.setItem('userDetails', userObject);                   
                     window.open(`/document`, "_self");
                 } else {
                     ToastPopup('error', "Something went wrong.");
                 }
 
             setTransactionStatus("Fetching user details...");
             const userDetails = await getUserDetailsForWallet(address, true); // Bypass cache
             if (!userDetails?.length) {
                 setError("Failed to fetch user details");
                 return;
             }
 
             setTransactionStatus("Logging in...");
             const LoginUsers = userDetails.filter((user) => user?.userName === userName);
             const response = await login(userName, publicKey);
             
             if (!response?.isAccess && !response.isAuth) {
                 ToastPopup('error', response?.message || "Authorization failed");
                 cookie.remove('userDetails');
                 cookie.remove('accessToken');
                 localStorage.removeItem('userDetails');
                 localStorage.removeItem('accessToken');
                 window.open(`/`, "_self");
                 return;
             }
 
             if (response.token) {
                 cookie.set('accessToken', response.token, { path: '/', sameSite: 'lax', secure: true });
                 localStorage.setItem('accessToken', response.token);
                 
                 const userObject = {};
                 Object.keys(LoginUsers[0] || {}).forEach((key) => {
                     if (isNaN(key)) {
                         userObject[key] = typeof LoginUsers[0][key] === 'bigint' 
                             ? LoginUsers[0][key].toString() 
                             : LoginUsers[0][key];
                     }
                 });
                 
                 cookie.set('userDetails', userObject);
                 localStorage.setItem('userDetails', JSON.stringify(userObject));
                 window.open(`/document`, "_self");
             }
         } catch (error) {
             ToastPopup('error', "Something went wrong.");
             console.error(error.message);
             console.error('Error during signup:', error);
             setError(error.message || "Something went wrong");
             ToastPopup('error', "Failed to complete signup");
         } finally {
             showLoader(true);
             showLoader(false);
             setTransactionStatus("");
         }
     };
 
 @@ -100,7 +142,7 @@ export default function SignUp() {
 
     return (
         <>
             {!loading && (
             {!loading ? (
                 <div className="flex items-center justify-center min-h-screen flex-col">
                     <div className="flex justify-center w-full max-w-[650px] h-[500px] rounded-lg shadow-md py-10 px-[100px] flex-col gap-8">
                         <div className="flex justify-center items-center text-center gap-6 flex-col">
 @@ -113,53 +155,60 @@ export default function SignUp() {
                             {!isWalletConnected ? (
                                 <Button
                                     variant="DButton"
                                     onClick={() => handleConnectWallet()}
                                     onClick={handleConnectWallet}
                                     className="w-full h-[55px]"
                                 >
                                     Connect Wallet
                                 </Button>
                             ) : (
                                 <form onSubmit={handleSubmit} className="space-y-4">
                                     <div className="">
                                         <div className="input-values-sign-up">
                                             <div className="input-field-div border border-gray-300 rounded-xl px-4 py-2">
                                                 <Input
                                                     id="user"
                                                     value={user}
                                                     onChange={(e) => {
                                                         let value = e?.target?.value?.trim()?.toLowerCase();
                                                         setUser(value); setError("");
                                                     }}
                                                     required
                                                     autoComplete="off"
                                                     className="focus:outline-none focus:border-transparent"
                                                 />
                                                 <span className="input-default text-gradient"> @{import.meta.env.VITE_PUBLIC_DOMAIN} </span>
                                             </div>
                                         <div className="input-field-div border border-gray-300 rounded-xl px-4 py-2">
                                             <Input
                                                 id="user"
                                                 value={user}
                                                 onChange={(e) => {
                                                     const value = e?.target?.value?.trim()?.toLowerCase();
                                                     setUser(value);
                                                     setError("");
                                                 }}
                                                 placeholder="Enter username"
                                                 className="w-full outline-none text-[14px]"
                                             />
                                         </div>
                                         {error && (
                                             <p className="text-red-500 text-sm mt-2">{error}</p>
                                         )}
                                     </div>
                                     <Button variant="DButton" type="submit" className="my_15 w-full h-[55px] rounded-[14px]  font-bold signup_confirm_btn " >
                                         Confirm
                                     <Button
                                         type="submit"
                                         variant="DButton"
                                         className="w-full h-[55px]"
                                         disabled={!user || loading}
                                     >
                                         Create Account
                                     </Button>
                                     <Button
                                         type="button"
                                         variant="outline"
                                         onClick={redirectToFaucet}
                                         className="w-full h-[55px] mt-2"
                                     >
                                         Get Test Tokens
                                     </Button>
                                     <div className=" flex items-center justify-center mt-[45px]">
                                         <Button
                                             type='button'
                                             onClick={redirectToFaucet}
                                             disabled={loading}
                                             variant="DButton"
                                             className="sm:py-7 py-6 sm:px-10 px-5 rounded-3xl font-bold sm:text-md text-sm signup_shadow_btn"
                                         >
                                             <span>Get Free Test Tokens? <br></br>(NEC Faucet)</span>
                                         </Button>
                                     </div>
                                 </form>
                             )}
                             {error && <p className="text-red-500 sm:text-xs text-[10px] text-center sm:mt-[23px] mt-[15px]">{error}</p>}
                         </div>
                     </div>
                 </div>
             )
             }
             ) : (
                 <div className="flex items-center justify-center min-h-screen flex-col gap-4">
                     <div className="loader"></div>
                     {transactionStatus && (
                         <p className="text-gray-600">{transactionStatus}</p>
                     )}
                 </div>
             )}
         </>
     );
 }