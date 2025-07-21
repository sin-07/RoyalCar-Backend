import express from "express";
import {
  submitReview,
  getAllReviews,
  getTestimonials,
  approveReview,
  deleteReview,
  getReviewStats
} from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const reviewRouter = express.Router();

// Public routes
reviewRouter.post('/submit', (req, res, next) => {
  console.log("Review submit route hit");
  console.log("Request body:", req.body);
  next();
}, submitReview); // Allow both logged in and anonymous users
reviewRouter.get('/testimonials', getTestimonials); // Public testimonials

// Protected routes (admin only)
reviewRouter.get('/all', protect, getAllReviews); // Get all reviews for admin
reviewRouter.put('/approve/:reviewId', protect, approveReview); // Approve/mark as testimonial
reviewRouter.delete('/:reviewId', protect, deleteReview); // Delete review
reviewRouter.get('/stats', protect, getReviewStats); // Review statistics

export default reviewRouter;
