if (html === undefined) {
    html = String.raw;
}
Vue.component('Sidebar', {
    data: function () {
        return {
        }
    },
    methods: {

    },
    computed: {

    },
    template: html`
        <div class="col-3 d-flex flex-shrink-0 bg-body-tertiary">
            <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
                <li class="nav-item">
                    <a href="#" class="nav-link active py-3 border-bottom rounded-0" aria-current="page" title="Home"
                       data-bs-toggle="tooltip" data-bs-placement="right">
                        <svg class="bi pe-none" width="24" height="24" role="img" aria-label="Home">
                            <use xlink:href="#home"/>
                        </svg>
                    </a>
                </li>
                <li>
                    <a href="#" class="nav-link py-3 border-bottom rounded-0" title="Dashboard" data-bs-toggle="tooltip"
                       data-bs-placement="right">
                        <svg class="bi pe-none" width="24" height="24" role="img" aria-label="Dashboard">
                            <use xlink:href="#speedometer2"/>
                        </svg>
                    </a>
                </li>
                <li>
                    <a href="#" class="nav-link py-3 border-bottom rounded-0" title="Orders" data-bs-toggle="tooltip"
                       data-bs-placement="right">
                        <svg class="bi pe-none" width="24" height="24" role="img" aria-label="Orders">
                            <use xlink:href="#table"/>
                        </svg>
                    </a>
                </li>
                <li>
                    <a href="#" class="nav-link py-3 border-bottom rounded-0" title="Products" data-bs-toggle="tooltip"
                       data-bs-placement="right">
                        <svg class="bi pe-none" width="24" height="24" role="img" aria-label="Products">
                            <use xlink:href="#grid"/>
                        </svg>
                    </a>
                </li>
                <li>
                    <a href="#" class="nav-link py-3 border-bottom rounded-0" title="Customers" data-bs-toggle="tooltip"
                       data-bs-placement="right">
                        <svg class="bi pe-none" width="24" height="24" role="img" aria-label="Customers">
                            <use xlink:href="#people-circle"/>
                        </svg>
                    </a>
                </li>
            </ul>
            <div style="background-color: wheat"></div>
        </div>`
})