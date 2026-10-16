# Quica: gerador de vídeos virais de física

Gera vídeos 9:16 de suspense ("a bolinha vai escapar?") com trilha sincronizada aos quiques e exporta MP4 (H.264 + AAC) pronto para TikTok e Reels.

## Como abrir

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo. Não tem dependências para instalar.

```
npm start
```

Depois abra http://localhost:5178 no Chrome (a exportação usa WebCodecs, que existe no Chrome e no Edge).

## Pastas

- `exports/`: os MP4 exportados (`AAAA-MM-DD-simulacao-seed.mp4`). Ficam fora do Git.
- `fundos/`: coloque aqui imagens geradas por IA (jpg/png/webp, de preferência 1080×1920). Elas aparecem no campo **Fundo** com 🖼.
- `data.json`: a semana salva (uma configuração por dia). Fica fora do Git.

## Simulações

| | |
|---|---|
| 🌀 Fuga do labirinto | camadas giratórias com fresta; cada fuga quebra uma camada |
| 🎯 Zona vermelha | a bolinha cresce a cada quique; escapa pela saída ou toca no vermelho |
| 💀 Chuva de bolinhas | plinko: quantas caem na zona vermelha? A última vem em câmera lenta |
| 🏁 Corrida de cores | 2 a 4 cores; a primeira a escapar de todas as camadas vence |
| 🏁 Corrida na pista | 3 a 8 bolinhas numa pista gerada pela seed: largada, rampas, pinos, pás, funil, bumpers; buracos, minas, pás vermelhas e serras eliminam; a primeira a cruzar a chegada vence |

A **seed** define o vídeo inteiro: a mesma seed sempre gera o mesmo vídeo. **🎯 Buscar final** testa seeds até achar o desfecho e a duração escolhidos.

As músicas são melodias em domínio público sintetizadas no próprio app (cada quique toca a próxima nota).

## Créditos

`public/vendor/mp4-muxer.mjs` é a biblioteca [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) 5.1.3 (licença MIT).
