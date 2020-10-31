<script>
const reciveText = ['가위', '바위', '보'];
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
	coin -= 1;
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
    <div class="panel panel-score">
      <dl class="desc">
        <dt>COIN</dt>
        <dd>{coin}</dd>
      </dl>
      <dl class="desc">
        <dt>SCORE</dt>
        <dd>{score}</dd>
      </dl>
    </div>
    
    <div class="panel panel-review">
      <dl class="desc desc-computer">
        <dt>
          COMPUTER
        </dt>
        <dd class:bg-comm={isStart || isDone} class="bg-rps{computerNum}">
          {#if !isStart && !isDone}
          READY
          {:else}
          <span class="screen-out">{reciveText[computerNum]}</span>
          {/if}
        </dd>
      </dl>
      <span class="txt-vs">VS</span>
      <dl class="desc desc-user">
        <dt>
          USER
        </dt>
        <dd class:bg-comm={isDone} class="bg-rps{myNum}">
          {#if !isStart && !isDone}
          READY
          {:else if !isStart && isDone}
          <span class="screen-out">{reciveText[myNum]}</span>
          {/if}
        </dd>
      </dl>    
    </div>

    <div class="item-control">
      <button type="button" class="btn btn-user btn-s" on:click={sendNumber(0)} disabled={!isStart || isDone}>가위</button>
      <button type="button" class="btn btn-user btn-r" on:click={sendNumber(1)} disabled={!isStart || isDone}>바위</button>
      <button type="button" class="btn btn-user btn-p" on:click={sendNumber(2)} disabled={!isStart || isDone}>보</button>
    </div>

    {#if !isStart && isDone}
    <div class="wrap-content">
      <div class="desc-result">
        <strong class="tit-desc">
          {resultText[result]}
        </strong>
        {#if result === 1}
        <p class="txt-bonus">
          Bonus Coin +{bonus}
        </p>
        {/if}
        {#if isGamePossible}
        <button type="button" class="btn btn-start" on:click={startGame}>Next Game</button>
        {:else}
        <p class="txt-result">
          <strong>GAME OVER</strong><br>
          <span class="txt-score">TOTAL SCORE {score}</span>
        </p>
        <button type="button" class="btn btn-start" on:click={newGame}>New Game</button>
        {/if}
      </div>
    </div>
    {/if}

    {#if !isStart && !isDone && isGamePossible}
    <div class="wrap-content">
      <button type="button" class="btn btn-about" on:click={() => isVisible = true}>About this game</button>
      <button type="button" class="btn btn-start" on:click={startGame}>Game Start</button>
    </div>
    {/if}

    {#if isVisible}
    <div class="layer">
      <div class="inner-layer">
        <strong class="tit-layer">
          <span class="r">가위</span> 
          <span class="b">바위</span>
          <span class="y">보</span>
          게임
        </strong>
        <div class="layer-body">
          <p class="txt-layer">
            - 컴퓨터와 가위 바위 보 게임을 합니다.<br>
            - 처음 코인 3개를 보유하고 게임을 시작합니다.<br>
            - 게임 한판당 코인 1개를 소모합니다.<br>
            - 코인 1개를 소모할 때 마다 100점을 얻습니다.<br>
            - 게임 승리시 점수 100점을 얻고 보너스 코인을 1~3개 무작위로 얻습니다.<br>
            - 게임 패배시 점수 100점을 잃습니다.<br>
            - 코인이 0개가 되면 게임이 종료됩니다.<br>
            <strong class="emph-g">코인을 다 소모할 때까지 최고 점수를 만들어 보세요!</strong>
          </p>
          <button type="button" class="btn btn-close" on:click={() => isVisible = !isVisible}>OK</button>
        </div>
      </div>
    </div>
    {/if}
  </main>
</div>

<style lang="scss" src="App.scss"></style>