import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reviewText: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Allow anonymous reviews
    },
    isApproved: {
        type: Boolean,
        default: false // Reviews need approval before showing in testimonials
    },
    isTestimonial: {
        type: Boolean,
        default: false // Mark if this review should be shown in testimonials
    },
    reviewType: {
        type: String,
        enum: ['delivery', 'service', 'general'],
        default: 'delivery'
    }
}, {
    timestamps: true
});

// Index for efficient queries
reviewSchema.index({ rating: -1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ isTestimonial: 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
