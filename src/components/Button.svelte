<button type="button" class="btn {buttonClassName}" on:click>
  <slot></slot>
</button>

<script>
export let buttonClassName;
</script>

<style lang="scss">
@import "src/assets/styles/utils/util_set";

.btn {
  min-width: 100px;
  height: 53px;
  margin-top: 10px;
  padding: 0 20px;
  border-radius: 6px;
  color: $color-white;
  line-height: 44px;

  &:active {
    line-height: 53px;
  }

  &-user {
    overflow: hidden;
    width: 110px;
    height: 110px;
    margin-top: 0;
    border-radius: 100%;
    border: 3px solid $color-black;
    font-size: 1px;
    text-indent: -9999px;
    background-repeat: no-repeat;
    background-position: 50%;
    background-size: 106%;
    box-shadow: 0 10px 0 $color-black;

    @include media-m {
      min-width: auto;
      width: 80px;
      height: 80px;
    }

    &:active {
      margin-top: 12px;
      box-shadow: 0 4px 0px 0px $color-black;
    }
  }

  &-start {
    border: 6px outset $color-primary;
    background-color: $color-primary;

    &:active {
      border: 6px inset $color-primary;
    }
  }

  &-about {
    border: 6px outset $color-dark-gray;
    background-color: $color-dark-gray;

    &:active {
      border: 6px inset $color-dark-gray;
    }
  }

  &-r {
    background-image: url(assets/images/1.gif);
  }

  &-p {
    background-image: url(assets/images/2.gif);
  }

  &-s {
    background-image: url(assets/images/0.gif);
  }
}
</style>