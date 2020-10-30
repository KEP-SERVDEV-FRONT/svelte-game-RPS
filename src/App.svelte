<script>
import { onMount } from "svelte";

// todo: 글자가 아니라 다른 방식으로 이쁘게 노출할것 고민하기
const reciveText = ['가위', '바위', '보'];
const resultText = ['비겼습니다.', '이겼습니다', '졌습니다.'];
let result, 
    interval,
    score = 0,
		bonus = 0,
    isDone = false,
    isStart = false,
    myNum = null;

$: coin = 3;
$: computerNum = null;
$: isGamePossible = coin > 0;

const createRandomNum = maxCount => Math.round(Math.random() * maxCount);

const startInterval = () => interval = setInterval(() => {
  computerNum = createRandomNum(2);
}, 100);

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

onMount(() => {
  // startGame()
});
</script>

<!-- todo: 테스트용 레이아웃, 시간 나면 컴포넌트 분리하기, 최종 레이아웃 스타일링 해야함. -->
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
        Computer
      </dt>
      <dd>
				<!-- todo: 최초 시작시 잠깐 undefined 표시되는 이슈 해결 해야함 -->
				{#if !isStart && !isDone}
				ready
				{:else}
				{reciveText[computerNum]}
        {/if}
      </dd>
    </dl>
    <span class="txt-vs">VS</span>
    <dl class="desc desc-user">
      <dt>
        User
      </dt>
      <dd>
        {#if !isStart && isDone}
        {reciveText[myNum]}
        {/if}
      </dd>
    </dl>    
  </div>

  <div class="item-control">
    <button type="button" class="btn" on:click={sendNumber(0)} disabled={isDone}>가위</button>
    <button type="button" class="btn" on:click={sendNumber(1)} disabled={isDone}>바위</button>
    <button type="button" class="btn" on:click={sendNumber(2)} disabled={isDone}>보</button>
  </div>

	<!-- todo: 결과화면 인터렉션 추가하기 -->
  <div class="wrap-content">
    {#if !isStart && isDone}
    <div class="desc-result">
      <strong class="tit-desc">{resultText[result]}</strong>
      {#if result === 1}
      <p class="txt-bonus">
        보너스 코인 {bonus}개 획득!
      </p>
      {/if}
      {#if isGamePossible}
      <button type="button" class="btn" on:click={startGame}>재시작</button>
      {:else}
      <p class="txt-warning">
				GAME OVER<br>
				최종 점수: {score}
			</p>
			<button type="button" class="btn" on:click={newGame}>새 게임시작</button>
      {/if}
    </div>
    {/if}

    {#if !isStart && !isDone && isGamePossible}
    <button type="button" class="btn" on:click={startGame}>게임시작</button>
    {/if}
  </div>

	<!-- todo: 게임방법 ui 구현 해야함 -->
</main>

<style lang="scss">

</style>