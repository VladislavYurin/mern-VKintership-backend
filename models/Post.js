import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    photo: String,
    timestamp: Date,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

export default mongoose.model("Post", PostSchema);