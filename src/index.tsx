import { Hono } from 'hono'
import homeHtml from './pages/home.html?raw'
import photosHtml from './pages/photos.html?raw'
import videosHtml from './pages/videos.html?raw'

const app = new Hono()

app.get('/', (c) => c.html(homeHtml))
app.get('/photos', (c) => c.html(photosHtml))
app.get('/videos', (c) => c.html(videosHtml))

export default app
