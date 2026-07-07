---
aside: false
outline: false
---

<script setup>
import { useRoute } from 'vitepress'

const route = useRoute()
const endpoint = route.data.params.endpoint
</script>

<ClientOnly>
  <OAOperation :operationId="endpoint" />
</ClientOnly>
