import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true },
    password: {type: String, required: true },
    mobile: {
        type: String, 
        required: function() { return this.role === 'user'; }, // Required only for regular users
        validate: {
            validator: function(v) {
                // Validate only if mobile is provided or if it's required
                if (!v && this.role === 'owner') return true; // Allow empty for owners
                return /^[0-9]{10}$/.test(v);
            },
            message: 'Mobile number must be exactly 10 digits'
        }
    },
    drivingLicense: {
        type: String, 
        required: function() { return this.role === 'user'; }, // Required only for regular users
        trim: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    role: {type: String, enum: ["owner", "user"], default: 'user' },
    image: {type: String, default: ''},
},{timestamps: true})

const User = mongoose.model('User', userSchema)

export default User