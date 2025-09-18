async function scrapeIMDbPoster(title) {
    const searchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(title)}&s=tt`;
    console.log('searchUrl: ', searchUrl);

    try {
        const response = await fetchv2(searchUrl);
        const html = await response.text();
        
        // 改进的正则表达式，更精确匹配电影结果
        const resultMatch = html.match(/<a href="(\/title\/tt\d+\/)[^"]*"[^>]*class="[^"]*ipc-metadata-list-summary-item__t[^"]*"/);
        
        if (resultMatch && resultMatch[1]) {
            const movieUrl = `https://www.imdb.com${resultMatch[1]}`;
            console.log('movieUrl: ', movieUrl);

            // 获取电影详情页
            const movieResponse = await fetchv2(movieUrl);
            const movieHtml = await movieResponse.text();
            
            // 改进的图片匹配逻辑
            const posterMatch = movieHtml.match(/<img[^>]*class="[^"]*ipc-image"[^>]*src="([^"]+)"[^>]*>/);
            
            if (posterMatch && posterMatch[1]) {
                // 移除图片URL中的尺寸参数，获取高质量图片
                const highQualityUrl = posterMatch[1].replace(/\._V1_.*\.jpg/, '._V1_.jpg');
                return highQualityUrl;
            }
        }
        
        // 如果没有找到图片，返回默认图片
        return "https://i.ibb.co/Y4b38sTG/Search-has-no-images.png";
        
    } catch (error) {
        console.error('爬取IMDb失败:', error);
        return "https://i.ibb.co/Y4b38sTG/Search-has-no-images.png";
    }
}

async function searchResults(keyword) {
    const searchUrl = `https://ddys.pro/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetchv2(searchUrl);
        const html = await response.text();

        // 检测 Cloudflare Challenge 页面
        if (html.includes('<title>Just a moment...</title>')) {
            console.log('⚠️ 遇到 Cloudflare Challenge 页面！');
        }

        // 继续正常处理


        const results = [];

        const articleRegex = /<article id="post-\d+"[^>]*>[\s\S]*?<h2 class="post-title"><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/g;
        let match;

        while ((match = articleRegex.exec(html)) !== null) {
            const href = match[1].trim();
            const title = match[2].trim();
            
            // 改进的slug提取逻辑
            const urlObj = new URL(href);
            const pathParts = urlObj.pathname.split('/').filter(part => part.trim() !== '');
            const titleCleaned = pathParts[pathParts.length - 1] || title.replace(/\s+/g, '-').toLowerCase();
            
            console.log('Searching IMDb for:', titleCleaned);
            const imageUrl = await scrapeIMDbPoster(titleCleaned);

            results.push({
                title,
                image: imageUrl,
                href
            });
        }

        console.log(results);
        return JSON.stringify(results);
    
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }

}

searchResults("chief of war").then(console.log).catch(console.error);

async function extractDetails(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const aliasMatch = html.match(/又名:\s*([^<]+)/);
        const descriptionMatch = html.match(/简介:\s*([\s\S]*?)<\/div>/);
        const airdateMatch = html.match(/年份:\s*(\d{4})/);

        const alias = aliasMatch ? aliasMatch[1].trim() : "N/A";
        const description = descriptionMatch ? descriptionMatch[1].trim() : "No description available.";
        const airdate = airdateMatch ? airdateMatch[1].trim() : "N/A";

        const details = [{
            alias,
            description,
            airdate
        }];

        console.log(JSON.stringify(details));
        return JSON.stringify(details);
    } catch (error) {
        console.error('Extract details error:', error);
        throw error;
    }
}

async function extractEpisodes(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();
        const episodes = [];

        const scriptMatch = html.match(/<script class="wp-playlist-script" type="application\/json">(\{[\s\S]*?\})<\/script>/);

        if (scriptMatch) {
            try {
                const jsonData = JSON.parse(scriptMatch[1]);

                jsonData.tracks.forEach(track => {
                    if (track.src0) {
                        const episodeMatch = track.src0.match(/S01E(\d+)/) || 
                                           track.caption.match(/\u7b2c(\d+)\u96c6/) ||
                                           track.caption.match(/EP?(\d+)/i);
                        const episodeNumber = episodeMatch ? parseInt(episodeMatch[1], 10) : null;

                        episodes.push({
                            href: `https://v.ddys.pro${track.src0.trim()}`,
                            number: episodeNumber,
                            title: track.caption || `Episode ${episodeNumber}`
                        });
                    }
                });
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
            }
        }

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.error('Extract episodes error:', error);
        throw error;
    }
}

async function extractStreamUrl(url) {
    return url;
}
