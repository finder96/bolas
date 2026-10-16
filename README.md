# Quica: gerador de vídeos virais de física

Gera vídeos 9:16 de suspense ("a bolinha vai escapar?") com trilha sincronizada aos quiques e exporta MP4 (H.264 + AAC) pronto para TikTok, Shorts e Reels.

- **App online:** https://finder96.github.io/bolas/
- **Vídeo do dia automático + perfis Bounce Odds:** veja [AUTOMACAO.md](AUTOMACAO.md)

## Como abrir

Online, é só abrir https://finder96.github.io/bolas/ no Chrome ou no Edge. A semana fica salva no navegador e o MP4 vai para Downloads.

No PC, precisa do [Node.js](https://nodejs.org) 18 ou mais novo (o app em si não tem dependências):

```
npm start
```

Depois abra http://localhost:5178 no Chrome (a exportação usa WebCodecs, que existe no Chrome e no Edge).

## Pastas

- `exports/`: os MP4 exportados (`AAAA-MM-DD-simulacao-seed.mp4`). Ficam fora do Git.
- `fundos/`: coloque aqui imagens geradas por IA (jpg/png/webp, de preferência 1080×1920). Elas aparecem no campo **Fundo** com 🖼.
- `data.json`: a semana salva (uma configuração por dia). Fica fora do Git.
- `scripts/diario.mjs`: gera o vídeo do dia sem interface (`npm install` e depois `npm run diario`). O resultado vai para `out/`, que fica fora do Git.
- `branding/`: foto de perfil e capa do YouTube do Bounce Odds (`node branding/gerar.mjs` refaz as duas).
- `.github/workflows/`: `pages.yml` publica o app online; `diario.yml` gera e publica o vídeo do dia.

## Simulações

| | |
|---|---|
| 🌀 Fuga do labirinto | camadas giratórias com fresta; cada fuga quebra uma camada |
| 🎯 Zona vermelha | a bolinha cresce a cada quique; escapa pela saída ou toca no vermelho |
| 💀 Chuva de bolinhas | plinko: quantas caem na zona vermelha? A última vem em câmera lenta. **Modo decisão**: as casas viram respostas ("Let the balls pick your dinner", "Should you text your ex?"…). **Sorte dos signos**: 12 bolinhas, uma por signo, e a tabela da sorte do dia no fim |
| 🏁 Corrida de cores | 2 a 4 cores; a primeira a escapar de todas as camadas vence |
| 🏁 Corrida na pista | 3 a 12 bolinhas numa pista gerada pela seed: largada, rampas, pinos, pás, funil, bumpers; buracos, minas, pás vermelhas e serras eliminam; a primeira a cruzar a chegada vence. Temas: cores, signos, países, mês de nascimento ou nomes dos comentários. **Modo liga**: tabela de pontos acumulada no fim do vídeo |
| 🤯 Multiplicação | cada quique pode virar +1 bolinha, mas a saída vai abrindo: chega a 1.000 ou esvazia? |
| 🗺️ Guerra de cores | 2 a 4 times pintam o mapa ao bater nas casas dos outros; quem domina quando o tempo acaba (aceita os mesmos temas da pista) |
| ✂️ Pedra, papel e tesoura | três exércitos de emojis (🪨📄✂️ ou 🔥💧🌿) se perseguem e convertem quem vencem |
| 📶 Corrida de ordenação | três algoritmos ordenam as mesmas barras com som; qual termina primeiro? |
| 🔍 Ache o diferente | três níveis de grade com um emoji diferente escondido, contagem e revelação |
| 📊 Corrida de barras | ranking de países ano a ano com dados oficiais do Banco Mundial (população e PIB, 1960–2024) |
| 🏳️ Quiz de bandeiras | bandeiras desenhadas no código, do fácil ao difícil, com contagem regressiva |
| 🀱 Dominó | fileira longa com pontos de risco: a última peça cai? |
| 🎨 Pixel art | um emoji vira pixel art e se pinta cor por cor; adivinhe antes de terminar |

A **seed** define o vídeo inteiro: a mesma seed sempre gera o mesmo vídeo. **🎯 Buscar final** testa seeds até achar o desfecho e a duração escolhidos.

As músicas são melodias em domínio público sintetizadas no próprio app (cada quique toca a próxima nota).

## Créditos

`public/vendor/mp4-muxer.mjs` é a biblioteca [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) 5.1.3 (licença MIT). O modo automático usa o [puppeteer-core](https://pptr.dev) (Apache-2.0). Os dados da corrida de barras são do [Banco Mundial](https://data.worldbank.org) (licença CC BY 4.0), e a fonte aparece no vídeo.
