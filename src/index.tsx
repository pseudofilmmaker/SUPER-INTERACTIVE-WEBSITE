import { Hono } from 'hono'
import homeHtml from './pages/home.html?raw'
import photosHtml from './pages/photos.html?raw'
import videosHtml from './pages/videos.html?raw'
import aboutHtml from './pages/about.html?raw'

const app = new Hono()

app.get('/', (c) => c.html(homeHtml))
app.get('/photos', (c) => c.html(photosHtml))
app.get('/videos', (c) => c.html(videosHtml))
app.get('/about', (c) => c.html(aboutHtml))

export default app
