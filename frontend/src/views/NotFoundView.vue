<template>
  <v-container fluid class="pa-4 text-center">
    <v-row justify="center" align="center" style="min-height: 60vh;">
      <v-col cols="12" md="6">
        <v-card class="pa-8">
          <v-icon size="120" color="grey-lighten-1" class="mb-4">
            mdi-map-marker-question
          </v-icon>
          
          <v-card-title class="text-h4 mb-4">
            صفحه یافت نشد
          </v-card-title>
          
          <v-card-text class="text-h6 mb-6">
            متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد.
          </v-card-text>
          
          <v-btn
            color="primary"
            size="large"
            to="/"
            prepend-icon="mdi-home"
          >
            بازگشت به صفحه اصلی
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// 404 Not Found view
</script>