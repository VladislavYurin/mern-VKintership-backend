import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    login: String,
    password: String,
    avatar: String,
    age: Number,
    city: String,
    university: String,
    lastName: String,
    firstName: String,
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
});

// Метод добавления друга
UserSchema.methods.addFriend = async function (friendId) {
    if (this.friends.includes(friendId)) {
        throw new Error('Пользователь уже в списке друзей');
    }
    this.friends.push(friendId);
    await this.save();
}

// Метод удаления друга
UserSchema.methods.removeFriend = async function (friendId) {
    if (!this.friends.includes(friendId)) {
        throw new Error('Пользователь не в списке друзей');
    }
    this.friends = this.friends.filter((id) => id.toString() !== friendId.toString());
    await this.save();
}


export default mongoose.model("User", UserSchema);