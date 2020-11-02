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
  <Button buttonClassName={'btn-start'} on:click={() => dispatch('eventStartGame')}>
    Next game
  </Button>
  {:else}
  <p class="txt-total">
    <strong>GAME OVER</strong><br>
    <span class="txt-score">TOTAL SCORE {score}</span>
  </p>
  <Button buttonClassName={'btn-start'} on:click={() => dispatch('eventNewGame')}>
    New game
  </Button>
  {/if}
</div>

<script>
import Button from '@/components/Button.svelte';
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();
export let resultText, result, bonus, isGamePossible, score;
</script>

<style lang="scss">
@import "src/assets/styles/utils/util_set";

.tit-desc {
  display: block;
  font-size: 46px;
  line-height: 50px;
}

.txt-bonus {
  color: #009026;
}

.txt-total {
  margin-top: 10px;
  color: $color-warning;
}

.txt-score {
  font-size: 12px;
}
</style>