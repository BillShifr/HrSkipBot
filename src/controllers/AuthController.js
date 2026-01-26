const axios = require('axios');
const User = require('../models/User');
const HhApiService = require('../services/HhApiService');

class AuthController {
  constructor(config) {
    this.config = config;
    this.hhApi = new HhApiService(config);
  }

  /**
   * Generate OAuth authorization URL
   * @param {string} telegramId - Telegram user ID
   * @returns {string} Authorization URL
   */
  getAuthUrl(telegramId) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.hh.clientId,
      redirect_uri: this.config.hh.redirectUri,
      state: telegramId // Store telegram ID in state for callback
    });

    return `${this.config.hh.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code
   * @param {string} telegramId - Telegram user ID from state
   * @returns {Promise<Object>} Token data
   */
  async exchangeCodeForToken(code, telegramId) {
    try {
      const response = await axios.post('https://hh.ru/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.config.hh.clientId,
        client_secret: this.config.hh.clientSecret,
        code: code,
        redirect_uri: this.config.hh.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData = response.data;

      // Save tokens to user
      const user = await User.findByTelegramId(telegramId);
      if (user) {
        // Update user with HH.ru tokens
        await User.update(user.id, {
          hh_access_token: tokenData.access_token,
          hh_refresh_token: tokenData.refresh_token,
          hh_token_expires_at: Date.now() + (tokenData.expires_in * 1000)
        });

        // Get user resume from HH.ru
        try {
          const resumes = await this.hhApi.getUserResume(tokenData.access_token);
          if (resumes && resumes.length > 0) {
            const mainResume = resumes[0];
            const resumeData = {
              hhId: mainResume.id,
              title: mainResume.title,
              url: mainResume.url
            };
            await User.update(user.id, {
              resume: JSON.stringify(resumeData)
            });
          }
        } catch (error) {
          console.error('Error fetching resume:', error);
        }
      }

      return {
        success: true,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token data
   */
  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('https://hh.ru/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.hh.clientId,
        client_secret: this.config.hh.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh token');
    }
  }
}

module.exports = AuthController;
