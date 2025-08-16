const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GovernmentScraper {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemma-3-1b-it" });
  }

  async scrapeGovernmentSite(url = 'https://webscraper.io/test-sites/e-commerce/allinone/computers') {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      // Navigate to the government website
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Extract notifications/news items
      const notifications = await page.evaluate(() => {
        const items = [];
        
        // Generic selectors for common government site structures
        // const selectors = [
        //   'article',
        //   '.news-item',
        //   '.notification',
        //   '.update-item',
        //   '.content-item',
        //   'li a[href*="notification"]',
        //   'li a[href*="news"]',
        //   '.list-group-item'
        // ];
        
        // for (const selector of selectors) {
        //   const elements = document.querySelectorAll(selector);
        //   if (elements.length > 0) {
        //     elements.forEach((element, index) => {
        //       if (index < 10) { // Limit to 10 items per scrape
        //         const titleElement = element.querySelector('h1, h2, h3, h4, h5, h6, .title, .heading') || element;
        //         const linkElement = element.querySelector('a') || element.closest('a') || element;
        //         const contentElement = element.querySelector('p, .content, .description') || element;
                
        //         const title = titleElement.textContent?.trim();
        //         const href = linkElement.href || linkElement.getAttribute('href');
        //         const content = contentElement.textContent?.trim();
                
        //         if (title && title.length > 10) {
        //           items.push({
        //             title: title.substring(0, 200),
        //             content: content?.substring(0, 1000) || title,
        //             url: href ? new URL(href, window.location.origin).href : window.location.href,
        //             scrapedFrom: window.location.href
        //           });
        //         }
        //       }
        //     });
        //     break; // Use first successful selector
        //   }
        // }
        
        // Select all elements on the page
        const elements = document.querySelectorAll('*');
        
        // Loop through all elements and extract text content
        elements.forEach((element) => {
          const textContent = element.textContent?.trim();
          if (textContent && textContent.length > 10) {
            items.push({
              title: textContent.substring(0, 200),
              content: textContent?.substring(0, 1000) || textContent,
              url: window.location.href,
              scrapedFrom: window.location.href
            });
          }
        });
        

        
        return items;
      });
      
      return notifications;
    } catch (error) {
      console.error('Scraping error:', error);
      throw new Error(`Failed to scrape government site: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async summarizeContent(content, title) {
    try {
      const prompt = `Please provide a 2-3 sentence plain-language summary of this government notification:

Title: ${title}
Content: ${content}

Summary should be:
- Easy to understand for general public
- Highlight key actions or deadlines
- Mention who is affected
- Keep it concise and actionable`;

      const response = await this.model.generateText({
        prompt: prompt,
        maxLength: 150,
        temperature: 0.3
      });

      return response.text.trim();
    } catch (error) {
      console.error('Google Gemini summarization error:', error);
      // Fallback to simple truncation if Google Gemini fails
      return content.length > 200 ? content.substring(0, 200) + '...' : content;
    }
  }

  categorizeNotification(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('health') || text.includes('medical') || text.includes('hospital')) {
      return 'health';
    } else if (text.includes('education') || text.includes('school') || text.includes('university')) {
      return 'education';
    } else if (text.includes('job') || text.includes('employment') || text.includes('recruitment')) {
      return 'employment';
    } else if (text.includes('tax') || text.includes('income') || text.includes('gst')) {
      return 'taxation';
    } else if (text.includes('legal') || text.includes('court') || text.includes('law')) {
      return 'legal';
    }
    
    return 'general';
  }

  calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

module.exports = GovernmentScraper;
