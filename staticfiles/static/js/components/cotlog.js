// const html = String.raw;
Vue.component('CotLog', {
    data: function () {
        return {
            sharedState: store.state,
        }
    },
    props: ['units'],
    methods: {
        
    },
    computed: {
        
    },
    template: html`
    <div class="accordion-item mb-1">
      <div class="accordion-header">
      <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseCotLog" aria-expanded="true" aria-controls="collapseCotLog">
          لاگ پیام‌های دریافتی
        </button>
      </div>
      <div id="collapseCotLog" class="accordion-collapse collapse" data-bs-parent="#accordion" style="">
        <div class="accordion-body">
            <ul class="list-group">
                <li class="list-group-item" v-for="u in units"></li>
            </ul>
        </div>
      </div>
    </div>`
})