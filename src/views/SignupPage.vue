<template>
<div class="sp">
  <div class="sp-box">
    <a href="/"><img src="/tlb-logo-primary.png" alt="The League Beat" class="sp-logo" /></a>
    <h1 class="sp-title">Create Your Account</h1>
    <p class="sp-sub">Connect your Sleeper, ESPN, or Yahoo league in minutes. Free to start.</p>
    <div class="sp-trust">
      <span>✓ No credit card</span>
      <span>✓ Sleeper, Yahoo & ESPN</span>
      <span>✓ Setup in 3 minutes</span>
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
onMounted(() => {
  router.push('/?signup=true')
})
</script>
<style scoped>
.sp{min-height:100vh;background:#05060a;display:flex;align-items:center;justify-content:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
.sp-box{text-align:center;padding:40px}
.sp-logo{height:60px;object-fit:contain;margin-bottom:24px}
.sp-title{font-size:28px;font-weight:900;color:#fff;margin:0 0 12px}
.sp-sub{font-size:16px;color:#6b7280;margin:0 0 20px;max-width:360px}
.sp-trust{display:flex;gap:16px;justify-content:center;font-size:12px;color:#4b5563;flex-wrap:wrap}
</style>
