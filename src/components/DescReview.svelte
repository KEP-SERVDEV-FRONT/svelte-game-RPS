<dl class="desc desc-{descType}">
  <dt>
    {descType.toLocaleUpperCase()}
  </dt>
  {#if descType === 'computer'}
  <dd class:bg-comm={isStart || isDone} class="bg-rps{computerNum}">
    {#if !isStart && !isDone}
    READY
    {:else}
    <span class="screen-out">
      {reciveSymbol[computerNum] ? reciveSymbol[computerNum].symbol : ''}
    </span>
    {/if}
  </dd>
  {:else}
  <dd class:bg-comm={isDone} class="bg-rps{myNum}">
    {#if !isStart && !isDone}
    READY
    {:else if !isStart && isDone}
    <span class="screen-out">{reciveSymbol[myNum].symbol}</span>
    {/if}
  </dd>
  {/if}
</dl>

<script>
export let descType, isStart, isDone, computerNum, reciveSymbol, myNum;
</script>

<style lang="scss">
@import "src/assets/styles/utils/util_set";

.desc {
  width: 35%;
  background-color: #111;
  color: $color-white;

  @include media-m {
    width: 40%;
  }

  &-computer {
    border-radius: 6px 0 0 6px;
    border-right: 3px solid $color-primary;
  }

  &-user {
    border-radius: 0 6px 6px 0;
    border-left: 3px solid $color-primary;
  }
}

dt {
  line-height: 34px;
}

dd {
  height: 100px;
  line-height: 100px;
}


.bg-comm {
  &:before {
    content: '';
    display: block;
    width: 90px;
    height: 90px;
    margin: 0 auto;
    background-image: url(assets/images/sp-rps.gif);
    background-repeat: no-repeat;
    background-size: 180px;
  }
}

.bg-rps0 {
  &:before {
    background-position: 0 0;
  }
}

.bg-rps1 {
  &:before {
    background-position: -90px -10px;
  }
}

.bg-rps2 {
  &:before {
    background-position: 0 -88px;
  }
}
</style>