sync function scrapeIMDbPoster(title) {
    const searchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(title)}&s=tt`;
    console.log('searchUrl: ', searchUrl);

    
    try {
        const response = await fetch(searchUrl);
        const html = await response.text();
        
        // 使用正则表达式提取第一个结果的URL
        const resultMatch = html.match(/href="(\/title\/tt\d+\/)[^"]+"/);
        if (resultMatch) {
            const movieUrl = `https://www.imdb.com${resultMatch[1]}`;

            console.log('movieUrl: ', movieUrl);
            // 获取电影详情页

            const movieResponse = await fetch(movieUrl);
            const movieHtml = await movieResponse.text();
            
            // 提取封面图片
            const posterMatch = movieHtml.match(/<img.+class="ipc-image".+src="([^"]+)"[^>]+/);
            if (posterMatch) {
                return posterMatch[1];
            }
}
        const imageUrl = "https://i.ibb.co/Y4b38sTG/Search-has-no-images.png";
        
        return imageUrl;
    } catch (error) {
        const imageUrl = "https://i.ibb.co/Y4b38sTG/Search-has-no-images.png";
        console.error('爬取IMDb失败:', error);
        return imageUrl;
    }
}

async function searchResults(keyword) {
    const searchUrl = `https://ddys.pro/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetchv2(searchUrl);
        const html = await response.text();
        const results = [];

        const articleRegex = /<article id="post-\d+"[^>]*>[\s\S]*?<h2 class="post-title"><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/g;
        let match;

        while ((match = articleRegex.exec(html)) !== null) {
            const href = match[1].trim();
            const title = match[2].trim();
            
            const urlObj = new URL(href);
            const pathname = urlObj.pathname; // "/chief-of-war/"
            const titleCleaned = pathname.replace(/\//g, '').trim();
            console.log(titleCleaned); // 输出: "chief-of-war"

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
        throw error;
    }
}

async function extractDetails(url) {
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
}

async function extractEpisodes(url) {
    const response = await fetchv2(url);
    const html = await response.text();
    const episodes = [];

    const scriptMatch = html.match(/<script class="wp-playlist-script" type="application\/json">(\{[\s\S]*?\})<\/script>/);

    if (scriptMatch) {
        const jsonData = JSON.parse(scriptMatch[1]);

        jsonData.tracks.forEach(track => {
            if (track.src0) {
                const episodeMatch = track.src0.match(/S01E(\d+)/) || track.caption.match(/\u7b2c(\d+)\u96c6/);
                const episodeNumber = episodeMatch ? parseInt(episodeMatch[1], 10) : null; // Convert to integer

                episodes.push({
                    href: `https://v.ddys.pro${track.src0.trim()}`,
                    number: episodeNumber
                });
            }
        });
    }

    console.log(episodes);
    return JSON.stringify(episodes);
}


async function extractStreamUrl(url) {
    return url;
}
