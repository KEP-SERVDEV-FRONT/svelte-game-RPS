<script>
import Button from '@/components/Button.svelte';
import PanelScore from '@/components/PanelScore.svelte';
import DescReview from '@/components/DescReview.svelte';
import DescResult from '@/components/DescResult.svelte';
import Layer from '@/components/Layer.svelte';

const reciveSymbol = [
  {
    symbol: '가위',
    name: 's'
  },
  {
    symbol: '바위',
    name: 'r'
  },
  {
    symbol: '보',
    name: 'p'
  },
];
const resultText = ['DRAW', 'WIN', 'LOSE'];
let result, 
    interval,
    score = 0,
    bonus = 0,
    isVisible = false,
    isDone = false,
    isStart = false,
    myNum = null;

$: coin = 3;
$: computerNum = null;
$: isGamePossible = coin > 0;

const createRandomNum = maxCount => Math.round(Math.random() * maxCount);

const startInterval = () => interval = setInterval(() => {
  computerNum = createRandomNum(2);
}, 80);

const resetState = (done, start) => {
	isDone = done;
  isStart = start;
}

const sendNumber = num => () => {
	clearInterval(interval);
  resultGame(computerNum - num);
	resetState(1, 0);
	myNum = num;
}

const coinBonus = () => {
  bonus = createRandomNum(2) + 1;
  coin += bonus;
}

const startGame = () => {  
	coin--;
	score += 100;
	resetState(0, 1);
  startInterval();
}

const newGame = () => {
	coin = 2;
	score = 100;
	resetState(0, 1);
	startInterval();
}

const resultGame = calc => {
  switch (calc) {
    case 0:
      result = 0;
      break;
    case -1:
    case 2:
      result = 1;
      score += 100;
      coinBonus();
      break;
    default:
      result = 2;
      score = score < 1 ? 0 : score -= 100;
      break;
  }
}
</script>

<div class="wrap-container">
  <main class="main">
    <PanelScore coin={coin} score={score} />
    <div class="panel panel-review">
      <DescReview
        descType={'computer'}
        isStart={isStart}
        isDone={isDone}
        reciveSymbol={reciveSymbol}
        computerNum={computerNum}
      />
      <span class="txt-vs">VS</span>
      <DescReview
        descType={'user'}
        isStart={isStart}
        isDone={isDone}
        reciveSymbol={reciveSymbol}
        myNum={myNum}
      />
    </div>

    {#if isStart && !isDone}
    <div class="item-control">
      {#each reciveSymbol as {symbol, name}, i}
      <Button buttonClassName={`btn-user btn-${name}`} on:click={sendNumber(i)}>
        {symbol}
      </Button>
      {/each}
    </div>
    {/if}

    {#if !isStart && isDone}
    <div class="wrap-content">
      <DescResult
        result={result}
        resultText={resultText}
        bonus={bonus}
        score={score}
        isGamePossible={isGamePossible}
        on:eventStartGame={() => startGame()}
        on:eventNewGame={() => newGame()}
      />
    </div>
    {/if}

    {#if !isStart && !isDone && isGamePossible}
    <div class="wrap-content">
      <Button buttonClassName={'btn-about'} on:click={() => isVisible = true}>
        About this game
      </Button>
      <Button buttonClassName={'btn-start'} on:click={startGame}>
        Game Start
      </Button>
    </div>
    {/if}

    {#if isVisible}
    <Layer on:eventVisible={() => isVisible = !isVisible} />
    {/if}
  </main>
</div>

<style lang="scss" src="App.scss"></style>