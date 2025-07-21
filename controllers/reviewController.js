import Review from "../models/Review.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Submit a new review
export const submitReview = async (req, res) => {
  try {
    console.log("Review submission request received:", req.body);
    const { customerName, rating, reviewText, userId } = req.body;

    // Validation
    if (!customerName || !rating || !reviewText) {
      console.log("Validation failed - missing fields");
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    if (rating < 1 || rating > 5) {
      console.log("Validation failed - invalid rating");
      return res.json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Get user ID from auth middleware or request body
    const reviewUserId = req.user ? req.user._id : (userId || null);
    console.log("User ID for review:", reviewUserId);

    // Check if user has already submitted a review (optional limitation)
    if (reviewUserId) {
      // Only check for duplicate reviews if the userId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(reviewUserId)) {
        const existingReview = await Review.findOne({ userId: reviewUserId });
        if (existingReview) {
          return res.json({
            success: false,
            message: "You have already submitted a review. Thank you for your feedback!"
          });
        }
      }
    }

    // Create new review
    const newReview = new Review({
      customerName: customerName.trim(),
      rating: parseInt(rating),
      reviewText: reviewText.trim(),
      userId: mongoose.Types.ObjectId.isValid(reviewUserId) ? reviewUserId : null,
      reviewType: 'delivery'
    });

    console.log("Creating review:", newReview);
    await newReview.save();
    console.log("Review saved successfully");

    res.json({
      success: true,
      message: "Review submitted successfully! Thank you for your feedback.",
      review: {
        id: newReview._id,
        customerName: newReview.customerName,
        rating: newReview.rating,
        reviewText: newReview.reviewText,
        createdAt: newReview.createdAt
      }
    });

  } catch (error) {
    console.error("Submit review error:", error);
    res.json({
      success: false,
      message: "Failed to submit review. Please try again."
    });
  }
};

// Get all reviews (for admin)
export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, approved, testimonial } = req.query;
    
    // Build filter
    const filter = {};
    if (approved !== undefined) {
      filter.isApproved = approved === 'true';
    }
    if (testimonial !== undefined) {
      filter.isTestimonial = testimonial === 'true';
    }

    const reviews = await Review.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(filter);

    res.json({
      success: true,
      reviews,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("Get reviews error:", error);
    res.json({
      success: false,
      message: "Failed to fetch reviews"
    });
  }
};

// Get approved testimonials for public display
export const getTestimonials = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const testimonials = await Review.find({
      isApproved: true,
      isTestimonial: true
    })
      .select('customerName rating reviewText createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      testimonials
    });

  } catch (error) {
    console.error("Get testimonials error:", error);
    res.json({
      success: false,
      message: "Failed to fetch testimonials"
    });
  }
};

// Approve a review (admin only)
export const approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isApproved, isTestimonial } = req.body;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    review.isApproved = isApproved !== undefined ? isApproved : review.isApproved;
    review.isTestimonial = isTestimonial !== undefined ? isTestimonial : review.isTestimonial;

    await review.save();

    res.json({
      success: true,
      message: "Review updated successfully",
      review
    });

  } catch (error) {
    console.error("Approve review error:", error);
    res.json({
      success: false,
      message: "Failed to update review"
    });
  }
};

// Delete a review (admin only)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndDelete(reviewId);
    
    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    res.json({
      success: true,
      message: "Review deleted successfully"
    });

  } catch (error) {
    console.error("Delete review error:", error);
    res.json({
      success: false,
      message: "Failed to delete review"
    });
  }
};

// Get review statistics (admin dashboard)
export const getReviewStats = async (req, res) => {
  try {
    const totalReviews = await Review.countDocuments();
    const approvedReviews = await Review.countDocuments({ isApproved: true });
    const testimonials = await Review.countDocuments({ isTestimonial: true });
    
    // Average rating
    const avgRatingResult = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);
    const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

    // Rating distribution
    const ratingDistribution = await Review.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalReviews,
        approvedReviews,
        testimonials,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingDistribution
      }
    });

  } catch (error) {
    console.error("Get review stats error:", error);
    res.json({
      success: false,
      message: "Failed to fetch review statistics"
    });
  }
};
