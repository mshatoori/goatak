<template>
  <div class="hierarchy-selector">
    <v-select
      v-model="selectedType"
      :items="typeOptions"
      item-title="name"
      item-value="code"
      label="انتخاب نوع"
      variant="outlined"
      density="compact"
      @update:model-value="updateSelection"
    >
      <template v-slot:item="{ props, item }">
        <v-list-item v-bind="props" :title="item.raw.name" :subtitle="item.raw.code"></v-list-item>
      </template>
    </v-select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props
interface Props {
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'G',
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Local state
const selectedType = ref(props.modelValue)

// Type options (simplified hierarchy)
const typeOptions = [
  // Ground units
  { code: 'G', name: 'واحد زمینی عمومی' },
  { code: 'G-U-C-I', name: 'پیاده نظام' },
  { code: 'G-U-C-M', name: 'موتوری' },
  { code: 'G-U-C-A', name: 'زرهی' },
  { code: 'G-U-C-R', name: 'تشخیص' },
  { code: 'G-U-C-S', name: 'تک تیرانداز' },
  { code: 'G-U-E', name: 'مهندسی' },
  { code: 'G-U-S', name: 'پشتیبانی' },
  { code: 'G-U-S-L', name: 'لجستیک' },
  { code: 'G-U-S-M', name: 'پزشکی' },
  { code: 'G-U-S-T', name: 'حمل و نقل' },

  // Air units
  { code: 'A', name: 'واحد هوایی عمومی' },
  { code: 'A-M-F', name: 'جنگنده' },
  { code: 'A-M-A', name: 'حمله' },
  { code: 'A-M-T', name: 'حمل و نقل' },
  { code: 'A-M-H', name: 'هلیکوپتر' },
  { code: 'A-M-U', name: 'پهپاد' },

  // Naval units
  { code: 'S', name: 'واحد دریایی عمومی' },
  { code: 'S-S', name: 'زیردریایی' },
  { code: 'S-C', name: 'جنگی' },
  { code: 'S-T', name: 'حمل و نقل' },

  // Special units
  { code: 'G-S', name: 'نیروهای ویژه' },
  { code: 'G-I', name: 'اطلاعات' },
  { code: 'G-C', name: 'فرماندهی' },
]

// Methods
const updateSelection = (value: string) => {
  selectedType.value = value
  emit('update:modelValue', value)
}

// Watch for external changes
import { watch } from 'vue'
watch(
  () => props.modelValue,
  newValue => {
    selectedType.value = newValue
  }
)
</script>

<style scoped>
.hierarchy-selector {
  width: 100%;
}
</style>
