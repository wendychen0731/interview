import { createApp } from 'vue';
import { Quasar, Dialog } from 'quasar';
import IndexPage from './pages/IndexPage.vue';

createApp(IndexPage)
  .use(Quasar, { plugins: { Dialog } })
  .mount('#q-app');
