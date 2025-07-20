import express from "express";
import { getCars, getUserData, loginUser, registerUser, adminLogin, sendOtp, verifyOtp, testConfig } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/admin-login', adminLogin)
userRouter.post('/send-otp', sendOtp)
userRouter.post('/verify-otp', verifyOtp)
userRouter.get('/test-config', testConfig)
userRouter.get('/data', protect, getUserData)
userRouter.get('/cars', getCars)

export default userRouter;