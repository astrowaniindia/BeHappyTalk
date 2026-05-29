const axios = require('axios');

// Configure with the user's keys
const APP_ID = '6a0b3f2282b43887db067973';
const APP_KEY = 'yJuraueQyZaBuGuTyEa5e4y7aUevy6u4eGyr';

// Basic Auth header setup
const getAuthHeader = () => {
    return {
        'Authorization': `Basic ${Buffer.from(APP_ID + ':' + APP_KEY).toString('base64')}`,
        'Content-Type': 'application/json'
    };
};

/**
 * Create a new EnableX Room
 */
const createRoom = async (name) => {
    try {
        const response = await axios.post(
            'https://api.enablex.io/video/v2/rooms',
            {
                name: name,
                owner_ref: "provider",
                settings: {
                    description: "BeHappyTalk Session",
                    mode: "group", // group mode allows multiple participants
                    scheduled: false,
                    adhoc: false,
                    duration: 60, // 60 mins default
                    participants: 2, // 1 user + 1 provider
                    auto_recording: false,
                    quality: "SD"
                }
            },
            { headers: getAuthHeader() }
        );
        return response.data.room; // Returns room object with room_id
    } catch (error) {
        console.error('Error creating EnableX room:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Generate a Token for a user to join an existing Room
 */
const createToken = async (roomId, userName, role = "participant") => {
    try {
        const response = await axios.post(
            `https://api.enablex.io/video/v2/rooms/${roomId}/tokens`,
            {
                name: userName,
                role: role,
                user_ref: "behappytalk_user"
            },
            { headers: getAuthHeader() }
        );
        return response.data.token;
    } catch (error) {
        console.error('Error generating EnableX token:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    createRoom,
    createToken
};
