import './settings/app.js';


const bannerFrame = document.getElementById('banner-frame');
fetch(bannerFrame.src)
.then(response => {
    if (!response.ok) {
        bannerFrame.remove();
    }
}).catch(error => {
    bannerFrame.remove();
});
