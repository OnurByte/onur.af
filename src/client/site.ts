import { siteSignature } from '../portfolio/signature';

document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('copy', (event) => event.preventDefault());

console.info(siteSignature);
