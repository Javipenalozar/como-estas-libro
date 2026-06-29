# Landing ¿Cómo estás?

Landing de preventa para el libro **¿Cómo estás? La pregunta más simple que casi nadie sabe responder**, de Javi Peñaloza.

## Archivos principales

- `site/index.html`: página que debe publicar Netlify.
- `site/assets/images/portada-como-estas.png`: portada del libro.
- `site/assets/downloads/`: carpeta futura para el PDF de muestra, por ejemplo capítulos 1 al 3.
- `netlify.toml`: configuración de publicación.

## Deploy en Netlify

### Opción rápida con Netlify CLI

```bash
netlify deploy --dir=site
netlify deploy --prod --dir=site
```

### Opción recomendada con Git

```bash
git init
git add README.md netlify.toml site
git commit -m "Add landing page for Como estas book"
```

Después conecta el repo en Netlify. Netlify detectará `netlify.toml` y publicará la carpeta `site`.

## Dominio

En Netlify, agrega el dominio o subdominio que quieras usar:

- `eventosjv.com`
- `www.eventosjv.com`
- `comoestas.eventosjv.com`
- `eventosjv.com/como-estas` si más adelante se integra con un sitio principal.

Para esta landing independiente, la opción más limpia es `comoestas.eventosjv.com`.

## Muestra gratuita

Cuando esté listo el PDF de muestra, guárdalo en `site/assets/downloads/` y enlázalo desde la landing como una acción secundaria. La acción principal debe seguir siendo comprar o reservar por WhatsApp.
