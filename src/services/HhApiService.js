const axios = require('axios');

class HhApiService {
  constructor(config) {
    this.config = config;
    this.baseURL = config?.hh?.baseUrl || 'https://api.hh.ru';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'User-Agent': 'hrSkipBot/1.0'
      }
    });
  }

  /**
   * Get user resume information
   * @param {string} accessToken - HH.ru access token
   * @returns {Promise<Object>} Resume data
   */
  async getUserResume(accessToken) {
    try {
      const response = await this.client.get('/resumes/mine', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user resume:', error);
      throw new Error('Failed to fetch resume from HH.ru');
    }
  }

  /**
   * Get recommended vacancies for a resume
   * @param {string} resumeId - Resume ID
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Recommended vacancies
   */
  async getRecommendedVacancies(resumeId, options = {}) {
    try {
      const params = {
        resume_id: resumeId,
        per_page: options.limit || 20,
        page: options.page || 0,
        ...options.filters
      };

      const response = await this.client.get('/vacancies', { params });

      return {
        items: response.data.items,
        found: response.data.found,
        pages: response.data.pages,
        page: response.data.page,
        per_page: response.data.per_page
      };
    } catch (error) {
      console.error('Error fetching recommended vacancies:', error);
      throw new Error('Failed to fetch recommended vacancies');
    }
  }

  /**
   * Search vacancies by keywords and filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Vacancies
   */
  async searchVacancies(searchParams) {
    try {
      const params = {
        text: searchParams.keywords,
        area: searchParams.area, // Region ID
        salary: searchParams.salary,
        currency: searchParams.currency || 'RUR',
        experience: searchParams.experience,
        employment: searchParams.employment,
        schedule: searchParams.schedule,
        per_page: searchParams.limit || 20,
        page: searchParams.page || 0,
        order_by: searchParams.orderBy || 'relevance'
      };

      const response = await this.client.get('/vacancies', { params });

      return {
        items: response.data.items.map(vacancy => ({
          id: vacancy.id,
          name: vacancy.name,
          employer: {
            name: vacancy.employer.name,
            url: vacancy.employer.url,
            hhId: vacancy.employer.id
          },
          salary: vacancy.salary,
          address: vacancy.address,
          published_at: vacancy.published_at,
          url: vacancy.alternate_url,
          snippet: vacancy.snippet,
          schedule: vacancy.schedule,
          employment: vacancy.employment
        })),
        found: response.data.found,
        pages: response.data.pages
      };
    } catch (error) {
      console.error('Error searching vacancies:', error);
      throw new Error('Failed to search vacancies');
    }
  }

  /**
   * Get detailed vacancy information
   * @param {string} vacancyId - Vacancy ID
   * @returns {Promise<Object>} Detailed vacancy
   */
  async getVacancyDetails(vacancyId) {
    try {
      const response = await this.client.get(`/vacancies/${vacancyId}`);

      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        employer: {
          name: response.data.employer.name,
          url: response.data.employer.url,
          site_url: response.data.employer.site_url,
          hhId: response.data.employer.id
        },
        salary: response.data.salary,
        address: response.data.address,
        published_at: response.data.published_at,
        url: response.data.alternate_url,
        contacts: response.data.contacts,
        schedule: response.data.schedule,
        employment: response.data.employment,
        experience: response.data.experience,
        key_skills: response.data.key_skills,
        specializations: response.data.specializations
      };
    } catch (error) {
      console.error('Error fetching vacancy details:', error);
      throw new Error('Failed to fetch vacancy details');
    }
  }

  /**
   * Get employer information
   * @param {string} employerId - Employer ID
   * @returns {Promise<Object>} Employer data
   */
  async getEmployerInfo(employerId) {
    try {
      const response = await this.client.get(`/employers/${employerId}`);

      return {
        id: response.data.id,
        name: response.data.name,
        url: response.data.alternate_url,
        site_url: response.data.site_url,
        description: response.data.description,
        logo_urls: response.data.logo_urls,
        area: response.data.area
      };
    } catch (error) {
      console.error('Error fetching employer info:', error);
      throw new Error('Failed to fetch employer information');
    }
  }

  /**
   * Get areas/regions list
   * @returns {Promise<Array>} Areas
   */
  async getAreas() {
    try {
      const response = await this.client.get('/areas');
      return response.data;
    } catch (error) {
      console.error('Error fetching areas:', error);
      throw new Error('Failed to fetch areas');
    }
  }

  /**
   * Get specializations
   * @returns {Promise<Array>} Specializations
   */
  async getSpecializations() {
    try {
      const response = await this.client.get('/specializations');
      return response.data;
    } catch (error) {
      console.error('Error fetching specializations:', error);
      throw new Error('Failed to fetch specializations');
    }
  }
}

module.exports = HhApiService;