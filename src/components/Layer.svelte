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
      <Button buttonClassName={'btn-about'} on:click={() => dispatch('eventVisible')}>
        OK
      </Button>
    </div>
  </div>
</div>

<script>
import Button from '@/components/Button.svelte';
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();
</script>

<style lang="scss">
@import "src/assets/styles/utils/util_set";

.layer {
  overflow-y: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  padding: 20px;
  border-radius: 6px;
  border: 6px solid $color-black;
  color: $color-white;
  background-color: rgba(18, 17, 41, .9);
  font-family: Arial, Helvetica, sans-serif;
  z-index: 100;
}

.tit-layer {
  font-size: 20px;
}

.r {
  color: $color-r;
}

.b {
  color: $color-b;
}

.y {
  color: $color-y;
}

.txt-layer {
  font-size: 16px;
  line-height: 30px;
}

.emph-g {
  color: $color-warning;
}
</style>