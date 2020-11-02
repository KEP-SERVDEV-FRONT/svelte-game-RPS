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

<script>
export let coin, score;
</script>

<style lang="scss">
@import "src/assets/styles/utils/util_set";

.panel-score {
  justify-content: space-between;
}

.desc {
  min-width: 120px;
  border-radius: 6px;
  border: 3px solid $color-primary;
  color: $color-white;
  line-height: 30px;
  background-color: $color-navy;
  @include media-m {
    width: auto;
  }
}

dt,
dd {
  padding: 0 10px;
}

dd {
  border-top: 2px dashed $color-primary;
}
</style>