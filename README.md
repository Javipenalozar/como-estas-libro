# Landing ¿Cómo estás?

Landing de preventa para el libro **¿Cómo estás? La pregunta más simple que casi nadie sabe responder**, de Javi Peñaloza.

## Archivos principales

- `outputs/index.html`: página que debe publicar Netlify.
- `outputs/portada-como-estas.png`: portada del libro.
- `netlify.toml`: configuración de publicación.

## Deploy en Netlify

### Opción rápida con Netlify CLI

```bash
netlify deploy --dir=outputs
netlify deploy --prod --dir=outputs
```

### Opción recomendada con Git

```bash
git init
git add README.md netlify.toml outputs/index.html outputs/como-estas-landing.html outputs/portada-como-estas.png
git commit -m "Add landing page for Como estas book"
```

Después conecta el repo en Netlify. Netlify detectará `netlify.toml` y publicará la carpeta `outputs`.

## Dominio

En Netlify, agrega el dominio o subdominio que quieras usar:

- `eventosjv.com`
- `www.eventosjv.com`
- `comoestas.eventosjv.com`
- `eventosjv.com/como-estas` si más adelante se integra con un sitio principal.

Para esta landing independiente, la opción más limpia es `comoestas.eventosjv.com`.
